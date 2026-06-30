import mongoose from "mongoose";
import DeliveryBoyModel from "../models/DeliveryBoy.model.js";
import DeliveryAssignmentModel from "../models/DeliveryAssignment.model.js";
import OrderModel from "../models/order.model.js";
import ErrorResponse from "../utils/ApiError.util.js";

const BASE_DELIVERY_FEE = 40;
const ECO_BONUS_RATE = 0.15;

const normalizeOtp = (otp) => {
    if (otp == null) return null;
    const s = String(otp).trim();
    if (!/^\d{4}$/.test(s)) return null;
    return s;
};

const computeEcoBonus = ({ vehicleType }) => {
    const isEcoEligible = ["Cycle", "EV_Scooter"].includes(vehicleType);
    const ecoBonus = isEcoEligible ? BASE_DELIVERY_FEE * ECO_BONUS_RATE : 0;
    return { isEcoEligible, ecoBonus, baseDeliveryFee: BASE_DELIVERY_FEE };
};

export const acceptOrder = async (req, res, next) => {
    try {
        const { orderId, shopId } = req.params;

        const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });
        if (!deliveryBoy) return next(new ErrorResponse("Delivery boy profile not found", 404));

        if (!deliveryBoy.isVerified) {
            return next(new ErrorResponse("Verification required to accept orders", 403));
        }

        if (!["Cycle", "EV_Scooter", "Petrol_Bike"].includes(deliveryBoy.vehicleType)) {
            return next(new ErrorResponse("vehicleType is invalid", 400));
        }

        const order = await OrderModel.findById(orderId);
        if (!order) return next(new ErrorResponse("Order not found", 404));

        const shopOrder = order.shopOrders.find((o) => String(o.shop) === String(shopId));
        if (!shopOrder) return next(new ErrorResponse("Shop order not found", 404));

        if (shopOrder.status !== "preparing") {
            return next(new ErrorResponse("Order is not ready for pickup", 400));
        }

        if (shopOrder.assignedDeliveryBoy) {
            return next(new ErrorResponse("Order already assigned", 400));
        }

        // Create OTP (secure enough for demo; production should hash OTP or use short-lived signed tokens)
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        shopOrder.assignedDeliveryBoy = req.user._id;
        shopOrder.status = "out of delivery";
        shopOrder.deliveryOtp = otp;
        shopOrder.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        const activeOrderId = String(orderId);

        await DeliveryAssignmentModel.findOneAndUpdate(
            { orderId: orderId, shopId: shopId },
            {
                orderId: orderId,
                shopId: shopId,
                deliveryBoyId: req.user._id,
                customerId: order.user,
                activeOrderId,
                status: "on_delivery",
                ecoBonusApplied: false,
                lastKnownLocation: {
                    type: "Point",
                    coordinates:
                        deliveryBoy.currentLocation?.coordinates?.length === 2
                            ? deliveryBoy.currentLocation.coordinates
                            : [0, 0],
                },
            },
            { upsert: true, new: true },
        );

        deliveryBoy.status = "on_delivery";
        await deliveryBoy.save();

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order accepted. Driver is now on_delivery.",
            shopOrder,
            activeOrderId,
        });
    } catch (error) {
        next(error);
    }
};

export const verifyOTPAndCompleteOrder = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const { id: orderId } = req.params;
        const otp = normalizeOtp(req.body?.otp);

        if (!otp) return next(new ErrorResponse("4-digit OTP is required", 400));

        await session.withTransaction(async () => {
            const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id }).session(session);
            if (!deliveryBoy) throw new ErrorResponse("Delivery boy not found", 404);

            const assignment = await DeliveryAssignmentModel.findOne({
                orderId,
                deliveryBoyId: req.user._id,
            }).session(session);

            if (!assignment) throw new ErrorResponse("Active assignment not found", 404);

            const order = await OrderModel.findById(orderId).session(session);
            if (!order) throw new ErrorResponse("Order not found", 404);

            const shopOrder = order.shopOrders.find(
                (o) => o.assignedDeliveryBoy && String(o.assignedDeliveryBoy) === String(req.user._id),
            );

            if (!shopOrder) throw new ErrorResponse("Shop order not found", 404);

            if (shopOrder.status !== "out of delivery") {
                throw new ErrorResponse("Order not ready for verification", 400);
            }

            if (normalizeOtp(shopOrder.deliveryOtp) !== otp) {
                throw new ErrorResponse("Invalid OTP", 400);
            }

            if (shopOrder.otpExpires && shopOrder.otpExpires < new Date()) {
                throw new ErrorResponse("OTP has expired", 400);
            }

            // Calculate payouts
            const { isEcoEligible, ecoBonus, baseDeliveryFee } = computeEcoBonus({ vehicleType: deliveryBoy.vehicleType });

            // Update order state
            shopOrder.status = "delivered";
            shopOrder.deliveredAt = new Date();
            shopOrder.deliveryOtp = null;
            shopOrder.otpExpires = null;

            // Update assignment state
            assignment.status = "completed";
            assignment.completedAt = new Date();
            assignment.ecoBonusApplied = isEcoEligible;
            await assignment.save({ session });

            // Atomically increment wallet fields
            const inc = {
                "wallet.earnings": baseDeliveryFee + ecoBonus,
                "wallet.ecoBonusEarnings": ecoBonus,
                "wallet.totalDeliveries": 1,
            };

            await DeliveryBoyModel.updateOne(
                { _id: deliveryBoy._id },
                {
                    $inc: inc,
                    $set: {
                        status: "online",
                    },
                    $unset: {
                        activeOrderId: "",
                    },
                },
                { session },
            );

            // Persist order
            await order.save({ session });
        });

        return res.status(200).json({
            success: true,
            message: "Order delivered and wallet updated atomically.",
        });
    } catch (error) {
        if (error instanceof ErrorResponse) {
            return next(error);
        }
        return next(error);
    } finally {
        session.endSession();
    }
};

