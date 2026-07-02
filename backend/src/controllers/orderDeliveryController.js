// import mongoose from "mongoose";
// import DeliveryBoyModel from "../models/DeliveryBoy.model.js";
// import DeliveryAssignmentModel from "../models/DeliveryAssignment.model.js";
// import OrderModel from "../models/order.model.js";
// import ErrorResponse from "../utils/ApiError.util.js";

// const BASE_DELIVERY_FEE = 40;
// const ECO_BONUS_RATE = 0.15;

// const normalizeOtp = (otp) => {
//     if (otp == null) return null;
//     const s = String(otp).trim();
//     if (!/^\d{4}$/.test(s)) return null;
//     return s;
// };

// const computeEcoBonus = ({ vehicleType }) => {
//     const isEcoEligible = ["Cycle", "EV_Scooter"].includes(vehicleType);
//     const ecoBonus = isEcoEligible ? BASE_DELIVERY_FEE * ECO_BONUS_RATE : 0;
//     return { isEcoEligible, ecoBonus, baseDeliveryFee: BASE_DELIVERY_FEE };
// };

// export const acceptOrder = async (req, res, next) => {
//     try {
//         const { orderId, shopId } = req.params;

//         const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });
//         if (!deliveryBoy) return next(new ErrorResponse("Delivery boy profile not found", 404));

//         if (!deliveryBoy.isVerified) {
//             return next(new ErrorResponse("Verification required to accept orders", 403));
//         }

//         if (!["Cycle", "EV_Scooter", "Petrol_Bike"].includes(deliveryBoy.vehicleType)) {
//             return next(new ErrorResponse("vehicleType is invalid", 400));
//         }

//         const order = await OrderModel.findById(orderId);
//         if (!order) return next(new ErrorResponse("Order not found", 404));

//         const shopOrder = order.shopOrders.find((o) => String(o.shop) === String(shopId));
//         if (!shopOrder) return next(new ErrorResponse("Shop order not found", 404));

//         if (shopOrder.status !== "preparing") {
//             return next(new ErrorResponse("Order is not ready for pickup", 400));
//         }

//         if (shopOrder.assignedDeliveryBoy) {
//             return next(new ErrorResponse("Order already assigned", 400));
//         }

//         // Create OTP (secure enough for demo; production should hash OTP or use short-lived signed tokens)
//         const otp = Math.floor(1000 + Math.random() * 9000).toString();

//         shopOrder.assignedDeliveryBoy = req.user._id;
//         shopOrder.status = "out of delivery";
//         shopOrder.deliveryOtp = otp;
//         shopOrder.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

//         const activeOrderId = String(orderId);

//         await DeliveryAssignmentModel.findOneAndUpdate(
//             { orderId: orderId, shopId: shopId },
//             {
//                 orderId: orderId,
//                 shopId: shopId,
//                 deliveryBoyId: req.user._id,
//                 customerId: order.user,
//                 activeOrderId,
//                 status: "on_delivery",
//                 ecoBonusApplied: false,
//                 lastKnownLocation: {
//                     type: "Point",
//                     coordinates:
//                         deliveryBoy.currentLocation?.coordinates?.length === 2
//                             ? deliveryBoy.currentLocation.coordinates
//                             : [0, 0],
//                 },
//             },
//             { upsert: true, new: true },
//         );

//         deliveryBoy.status = "on_delivery";
//         await deliveryBoy.save();

//         await order.save();

//         return res.status(200).json({
//             success: true,
//             message: "Order accepted. Driver is now on_delivery.",
//             shopOrder,
//             activeOrderId,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// export const verifyOTPAndCompleteOrder = async (req, res, next) => {
//     const session = await mongoose.startSession();

//     try {
//         const { id: orderId } = req.params;
//         const otp = normalizeOtp(req.body?.otp);

//         if (!otp) return next(new ErrorResponse("4-digit OTP is required", 400));

//         await session.withTransaction(async () => {
//             const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id }).session(session);
//             if (!deliveryBoy) throw new ErrorResponse("Delivery boy not found", 404);

//             const assignment = await DeliveryAssignmentModel.findOne({
//                 orderId,
//                 deliveryBoyId: req.user._id,
//             }).session(session);

//             if (!assignment) throw new ErrorResponse("Active assignment not found", 404);

//             const order = await OrderModel.findById(orderId).session(session);
//             if (!order) throw new ErrorResponse("Order not found", 404);

//             const shopOrder = order.shopOrders.find(
//                 (o) => o.assignedDeliveryBoy && String(o.assignedDeliveryBoy) === String(req.user._id),
//             );

//             if (!shopOrder) throw new ErrorResponse("Shop order not found", 404);

//             if (shopOrder.status !== "out of delivery") {
//                 throw new ErrorResponse("Order not ready for verification", 400);
//             }

//             if (normalizeOtp(shopOrder.deliveryOtp) !== otp) {
//                 throw new ErrorResponse("Invalid OTP", 400);
//             }

//             if (shopOrder.otpExpires && shopOrder.otpExpires < new Date()) {
//                 throw new ErrorResponse("OTP has expired", 400);
//             }

//             // Calculate payouts
//             const { isEcoEligible, ecoBonus, baseDeliveryFee } = computeEcoBonus({ vehicleType: deliveryBoy.vehicleType });

//             // Update order state
//             shopOrder.status = "delivered";
//             shopOrder.deliveredAt = new Date();
//             shopOrder.deliveryOtp = null;
//             shopOrder.otpExpires = null;

//             // Update assignment state
//             assignment.status = "completed";
//             assignment.completedAt = new Date();
//             assignment.ecoBonusApplied = isEcoEligible;
//             await assignment.save({ session });

//             // Atomically increment wallet fields
//             const inc = {
//                 "wallet.earnings": baseDeliveryFee + ecoBonus,
//                 "wallet.ecoBonusEarnings": ecoBonus,
//                 "wallet.totalDeliveries": 1,
//             };

//             await DeliveryBoyModel.updateOne(
//                 { _id: deliveryBoy._id },
//                 {
//                     $inc: inc,
//                     $set: {
//                         status: "online",
//                     },
//                     $unset: {
//                         activeOrderId: "",
//                     },
//                 },
//                 { session },
//             );

//             // Persist order
//             await order.save({ session });
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Order delivered and wallet updated atomically.",
//         });
//     } catch (error) {
//         if (error instanceof ErrorResponse) {
//             return next(error);
//         }
//         return next(error);
//     } finally {
//         session.endSession();
//     }
// };


//!

import mongoose from "mongoose";
import DeliveryBoyModel from "../models/DeliveryBoy.model.js";
import DeliveryAssignmentModel from "../models/DeliveryAssignment.model.js";
import OrderModel from "../models/order.model.js";
import ErrorResponse from "../utils/ApiError.util.js";

const BASE_DELIVERY_FEE = 40;
const ECO_BONUS_RATE = 0.15;
const MAX_OTP_ATTEMPTS = 3; // अधिकतम 3 कोशिशें
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 मिनट का लॉकआउट

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
    const session = await mongoose.startSession();
    try {
        const { orderId, shopId } = req.params;

        await session.withTransaction(async () => {
            const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id }).session(session);
            if (!deliveryBoy) throw new ErrorResponse("Delivery boy profile not found", 404);

            if (!deliveryBoy.isVerified) {
                throw new ErrorResponse("Verification required to accept orders", 403);
            }

            if (!["Cycle", "EV_Scooter", "Petrol_Bike"].includes(deliveryBoy.vehicleType)) {
                throw new ErrorResponse("vehicleType is invalid", 400);
            }

            if (deliveryBoy.status === "on_delivery") {
                throw new ErrorResponse("You already have an active delivery", 400);
            }

            const order = await OrderModel.findById(orderId).session(session);
            if (!order) throw new ErrorResponse("Order not found", 404);

            const shopOrder = order.shopOrders.find((o) => String(o.shop) === String(shopId));
            if (!shopOrder) throw new ErrorResponse("Shop order not found", 404);

            if (shopOrder.status !== "preparing") {
                throw new ErrorResponse("Order is not ready for pickup", 400);
            }

            if (shopOrder.assignedDeliveryBoy) {
                throw new ErrorResponse("Order already assigned", 400);
            }

            const otp = Math.floor(1000 + Math.random() * 9000).toString();

            shopOrder.assignedDeliveryBoy = req.user._id;
            shopOrder.status = "out of delivery";
            shopOrder.deliveryOtp = otp;
            shopOrder.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

            await DeliveryAssignmentModel.findOneAndUpdate(
                { orderId, shopId },
                {
                    orderId,
                    shopId,
                    deliveryBoyId: req.user._id,
                    customerId: order.user,
                    activeOrderId: orderId,
                    status: "on_delivery",
                    ecoBonusApplied: false,
                    lastKnownLocation: {
                        type: "Point",
                        coordinates: deliveryBoy.currentLocation?.coordinates?.length === 2
                            ? deliveryBoy.currentLocation.coordinates
                            : [0,0],
                    },
                },
                { upsert: true, new: true, session },
            );

            deliveryBoy.status = "on_delivery";
            deliveryBoy.activeOrderId = orderId;

            await deliveryBoy.save({ session });
            await order.save({ session });
        });

        return res.status(200).json({
            success: true,
            message: "Order accepted. Driver is now on_delivery.",
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};

export const verifyOTPAndCompleteOrder = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const { id: orderId } = req.params;
        const { otp: rawOtp, shopId } = req.body;
        const otp = normalizeOtp(rawOtp);

        if (!otp) return next(new ErrorResponse("4-digit OTP is required", 400));
        if (!shopId) return next(new ErrorResponse("Shop ID is required", 400));

        await session.withTransaction(async () => {
            const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id }).session(session);
            if (!deliveryBoy) throw new ErrorResponse("Delivery boy not found", 404);

            const assignment = await DeliveryAssignmentModel.findOne({
                orderId,
                shopId,
                deliveryBoyId: req.user._id,
            }).session(session);

            if (!assignment) throw new ErrorResponse("Active assignment not found for this shop", 404);

            // सिक्युरिटी चेक: क्या ड्राइवर का OTP डालने का प्रयास लॉक है?
            if (assignment.otpLockUntil && assignment.otpLockUntil > new Date()) {
                const remainingTime = Math.ceil((assignment.otpLockUntil - new Date()) / 1000 / 60);
                throw new ErrorResponse(`Too many wrong attempts. Locked for ${remainingTime} more minutes.`, 403);
            }

            const order = await OrderModel.findById(orderId).session(session);
            if (!order) throw new ErrorResponse("Order not found", 404);

            const shopOrder = order.shopOrders.find(
                (o) => String(o.shop) === String(shopId) && String(o.assignedDeliveryBoy) === String(req.user._id),
            );

            if (!shopOrder) throw new ErrorResponse("Matching shop order not found for this driver", 404);

            if (shopOrder.status !== "out of delivery") {
                throw new ErrorResponse("Order not ready for verification", 400);
            }

            if (shopOrder.otpExpires && shopOrder.otpExpires < new Date()) {
                throw new ErrorResponse("OTP has expired", 400);
            }

            // OTP गलत होने पर का लॉजिक
            if (normalizeOtp(shopOrder.deliveryOtp) !== otp) {
                assignment.otpAttempts = (assignment.otpAttempts || 0) + 1;

                if (assignment.otpAttempts >= MAX_OTP_ATTEMPTS) {
                    assignment.otpLockUntil = new Date(Date.now() + LOCKOUT_DURATION);
                    assignment.otpAttempts = 0; // लॉक होने के बाद अटेम्प्ट रीसेट
                    await assignment.save({ session });
                    throw new ErrorResponse(`Wrong OTP. Maximum attempts reached. Account locked for 5 minutes.`, 403);
                }

                await assignment.save({ session });
                const attemptsLeft = MAX_OTP_ATTEMPTS - assignment.otpAttempts;
                throw new ErrorResponse(`Invalid OTP. You have ${attemptsLeft} attempts left.`, 400);
            }

            const { isEcoEligible, ecoBonus, baseDeliveryFee } = computeEcoBonus({ vehicleType: deliveryBoy.vehicleType });

            shopOrder.status = "delivered";
            shopOrder.deliveredAt = new Date();
            shopOrder.deliveryOtp = null;
            shopOrder.otpExpires = null;

            assignment.status = "completed";
            assignment.completedAt = new Date();
            assignment.ecoBonusApplied = isEcoEligible;
            assignment.otpAttempts = 0;
            assignment.otpLockUntil = null;
            await assignment.save({ session });

            deliveryBoy.wallet.earnings += (baseDeliveryFee + ecoBonus);
            deliveryBoy.wallet.ecoBonusEarnings += ecoBonus;
            deliveryBoy.wallet.totalDeliveries += 1;
            deliveryBoy.status = "online";
            deliveryBoy.activeOrderId = undefined;

            await deliveryBoy.save({ session });
            await order.save({ session });
        });

        return res.status(200).json({
            success: true,
            message: "Order delivered and wallet updated atomically.",
        });
    } catch (error) {
        next(error);
    } finally {
        session.endSession();
    }
};




