import mongoose from "mongoose";
import OrderModel from "../models/order.model.js";
import ShopModel from "../models/Shop.model.js";
import ItemModel from "../models/Item.model.js";
import UserModel from "../models/User.model.js";
import DeliveryBoyModel from "../models/DeliveryBoy.model.js";
import DeliveryAssignmentModel from "../models/DeliveryAssignment.model.js";
import ErrorResponse from "../utils/ApiError.util.js";

const BASE_DELIVERY_FEE = 40;
const ECO_BONUS_RATE = 0.15;

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

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

/* ---------------------------------------------
   placeOrder
   POST /api/order/place
   Customer places an order. Cart items are grouped
   by shop into order.shopOrders[].
--------------------------------------------- */
// export const placeOrder = async (req, res, next) => {
//     try {
//         const { cartItems, deliveryAddress, paymentMethod } = req.body;

//         if (!Array.isArray(cartItems) || cartItems.length === 0) {
//             return next(new ErrorResponse("Cart is empty", 400));
//         }
//         if (!deliveryAddress) {
//             return next(new ErrorResponse("Delivery address is required", 400));
//         }

//         // Group items by shop
//         const groupedByShop = {};
//         for (const cartItem of cartItems) {
//             const item = await ItemModel.findById(cartItem.item);
//             if (!item) return next(new ErrorResponse(`Item not found: ${cartItem.item}`, 404));

//             const shopId = String(item.shop);
//             if (!groupedByShop[shopId]) groupedByShop[shopId] = [];

//             groupedByShop[shopId].push({
//                 item: item._id,
//                 name: item.name,
//                 price: item.price,
//                 quantity: cartItem.quantity || 1,
//             });
//         }

//         const shopOrders = Object.entries(groupedByShop).map(([shopId, items]) => {
//             const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
//             return {
//                 shop: shopId,
//                 items,
//                 subtotal,
//                 status: "pending",
//                 assignedDeliveryBoy: null,
//                 deliveryOtp: null,
//                 otpExpires: null,
//                 deliveredAt: null,
//             };
//         });

//         const totalAmount = shopOrders.reduce((sum, so) => sum + so.subtotal, 0);

//         const order = await OrderModel.create({
//             user: req.user._id,
//             shopOrders,
//             deliveryAddress,
//             paymentMethod: paymentMethod || "COD",
//             totalAmount,
//         });

//         return res.status(201).json({
//             success: true,
//             message: "Order placed successfully",
//             order,
//         });
//     } catch (error) {
//         next(error);
//     }
// };


export const placeOrder = async (req, res, next) => {
    try {
        const { cartItems, paymentMethod, deliveryAddress, totalAmount } = req.body;

        const groupItemsByShop = {};

        cartItems.forEach((item) => {
            const shopId = item.shop;
            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = [];
            }
            groupItemsByShop[shopId].push(item);
        });

        const shopOrders = await Promise.all(
            Object.keys(groupItemsByShop).map(async (shopId) => {
                const shop = await ShopModel.findById(shopId).populate("owner");

                if (!shop) {
                    return next(
                        new ErrorResponse(`Shop with id ${shopId} not found`, 404),
                    );
                }

                const items = groupItemsByShop[shopId];
                const subtotal = items.reduce(
                    (sum, item) => sum + Number(item.price) * Number(item.quantity),
                    0,
                );

                return {
                    shop: shop._id,
                    owner: shop.owner._id,
                    subtotal,
                    shopOrderItems: items.map((item) => {
                        console.log("item: ", item);
                        return {
                            item: item.id,
                            price: item.price,
                            quantity: item.quantity,
                            name: item.name,
                        };
                    }),
                };
            }),
        );

        const newOrder = await OrderModel.create({
            user: req.user._id,
            paymentMethod,
            deliveryAddress,
            totalAmount,
            shopOrders,
        });

        await newOrder.populate(
            "shopOrders.shopOrderItems.item",
            "name image price",
        );
        await newOrder.populate("shopOrders.shop", "name");

        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            newOrder,
        });
    } catch (error) {
        next(error);
    }
};
/* ---------------------------------------------
   getOrders
   GET /api/order/orders
   Returns orders relevant to the logged-in user:
   - customer  -> their own orders
   - owner     -> orders containing their shop
   - deliveryBoy -> orders assigned to them
--------------------------------------------- */
export const getOrders = async (req, res, next) => {
    try {
        const role = req.user.role;
        let orders = [];

        if (role === "owner") {
            const shop = await ShopModel.findOne({ owner: req.user._id });
            if (!shop) return next(new ErrorResponse("Shop not found for this owner", 404));

            orders = await OrderModel.find({ "shopOrders.shop": shop._id })
                .populate("user", "name email mobile")
                .sort({ createdAt: -1 });
        } else if (role === "deliveryBoy") {
            orders = await OrderModel.find({ "shopOrders.assignedDeliveryBoy": req.user._id })
                .populate("user", "name email mobile")
                .sort({ createdAt: -1 });
        } else {
            orders = await OrderModel.find({ user: req.user._id })
                .populate("shopOrders.shop", "name")
                .sort({ createdAt: -1 });
        }

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        next(error);
    }
};

/* ---------------------------------------------
   updateOrderStatus
   PATCH /api/order/update-status/:orderId/:shopId
   Shop owner moves an order through: pending -> preparing -> ready
--------------------------------------------- */
export const updateOrderStatus = async (req, res, next) => {
    try {
        const { orderId, shopId } = req.params;
        const { status } = req.body;

        const allowedStatuses = ["pending", "preparing", "ready", "cancelled"];
        if (!allowedStatuses.includes(status)) {
            return next(new ErrorResponse("Invalid status value", 400));
        }

        const order = await OrderModel.findById(orderId);
        if (!order) return next(new ErrorResponse("Order not found", 404));

        const shopOrder = order.shopOrders.find((o) => String(o.shop) === String(shopId));
        if (!shopOrder) return next(new ErrorResponse("Shop order not found", 404));

        // Verify the requester actually owns this shop
        const shop = await ShopModel.findById(shopId);
        if (!shop || String(shop.owner) !== String(req.user._id)) {
            return next(new ErrorResponse("Not authorized to update this shop's order", 403));
        }

        shopOrder.status = status;
        await order.save();

        return res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            shopOrder,
        });
    } catch (error) {
        next(error);
    }
};

/* ---------------------------------------------
   getOnlineDeliveryBoys
   GET /api/order/online-delivery-boys
   Returns verified delivery boys currently online,
   optionally near a given lat/lng.
--------------------------------------------- */
export const getOnlineDeliveryBoys = async (req, res, next) => {
    try {
        const { lat, lng, maxDistanceKm = 5 } = req.query;

        const baseQuery = {
            status: "online",
            isVerified: true,
        };

        let deliveryBoys;

        if (lat && lng) {
            deliveryBoys = await DeliveryBoyModel.find({
                ...baseQuery,
                currentLocation: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [parseFloat(lng), parseFloat(lat)],
                        },
                        $maxDistance: Number(maxDistanceKm) * 1000,
                    },
                },
            }).populate("user", "name mobile");
        } else {
            deliveryBoys = await DeliveryBoyModel.find(baseQuery).populate("user", "name mobile");
        }

        return res.status(200).json({
            success: true,
            count: deliveryBoys.length,
            deliveryBoys,
        });
    } catch (error) {
        next(error);
    }
};

/* ---------------------------------------------
   assignDeliveryBoy
   PATCH /api/order/assign-delivery-boy/:orderId/:shopId
   System/owner assigns a specific online delivery boy
   to a shop order that is "ready".
--------------------------------------------- */
export const assignDeliveryBoy = async (req, res, next) => {
    try {
        const { orderId, shopId } = req.params;
        const { deliveryBoyId } = req.body;

        if (!deliveryBoyId) return next(new ErrorResponse("deliveryBoyId is required", 400));

        const deliveryBoy = await DeliveryBoyModel.findById(deliveryBoyId);
        if (!deliveryBoy) return next(new ErrorResponse("Delivery boy not found", 404));

        if (!deliveryBoy.isVerified) {
            return next(new ErrorResponse("Delivery boy is not verified", 400));
        }
        if (deliveryBoy.status !== "online") {
            return next(new ErrorResponse("Delivery boy is not online", 400));
        }

        const order = await OrderModel.findById(orderId);
        if (!order) return next(new ErrorResponse("Order not found", 404));

        const shopOrder = order.shopOrders.find((o) => String(o.shop) === String(shopId));
        if (!shopOrder) return next(new ErrorResponse("Shop order not found", 404));

        if (shopOrder.status !== "ready") {
            return next(new ErrorResponse("Order is not ready for assignment", 400));
        }
        if (shopOrder.assignedDeliveryBoy) {
            return next(new ErrorResponse("Order already assigned", 400));
        }

        shopOrder.assignedDeliveryBoy = deliveryBoy.user;
        await order.save();

        await DeliveryAssignmentModel.findOneAndUpdate(
            { orderId, shopId },
            {
                orderId,
                shopId,
                deliveryBoyId: deliveryBoy.user,
                customerId: order.user,
                activeOrderId: String(orderId),
                status: "assigned",
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

        deliveryBoy.status = "assigned";
        await deliveryBoy.save();

        return res.status(200).json({
            success: true,
            message: "Delivery boy assigned to order",
            shopOrder,
        });
    } catch (error) {
        next(error);
    }
};

/* ---------------------------------------------
   acceptOrder
   PATCH /api/order/accept/:orderId/:shopId
   Delivery boy accepts an order that is "preparing"/"ready"
   for pickup. Generates a 4-digit delivery OTP.
--------------------------------------------- */
export const acceptDeliveryOrder = async (req, res, next) => {
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

        if (shopOrder.status !== "preparing" && shopOrder.status !== "ready") {
            return next(new ErrorResponse("Order is not ready for pickup", 400));
        }

        if (shopOrder.assignedDeliveryBoy) {
            return next(new ErrorResponse("Order already assigned", 400));
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        shopOrder.assignedDeliveryBoy = req.user._id;
        shopOrder.status = "accepted";
        shopOrder.deliveryOtp = otp;
        shopOrder.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        const activeOrderId = String(orderId);

        await DeliveryAssignmentModel.findOneAndUpdate(
            { orderId, shopId },
            {
                orderId,
                shopId,
                deliveryBoyId: req.user._id,
                customerId: order.user,
                activeOrderId,
                status: "accepted",
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

        deliveryBoy.status = "assigned";
        await deliveryBoy.save();

        await order.save();

        return res.status(200).json({
            success: true,
            message: "Order accepted by delivery boy",
            shopOrder,
            activeOrderId,
        });
    } catch (error) {
        next(error);
    }
};

/* ---------------------------------------------
   startDelivery
   PATCH /api/order/start-delivery/:orderId/:shopId
   Delivery boy confirms pickup from shop and starts
   moving towards the customer.
--------------------------------------------- */
export const startDelivery = async (req, res, next) => {
    try {
        const { orderId, shopId } = req.params;

        const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });
        if (!deliveryBoy) return next(new ErrorResponse("Delivery boy profile not found", 404));

        const order = await OrderModel.findById(orderId);
        if (!order) return next(new ErrorResponse("Order not found", 404));

        const shopOrder = order.shopOrders.find((o) => String(o.shop) === String(shopId));
        if (!shopOrder) return next(new ErrorResponse("Shop order not found", 404));

        if (String(shopOrder.assignedDeliveryBoy) !== String(req.user._id)) {
            return next(new ErrorResponse("This order is not assigned to you", 403));
        }

        if (shopOrder.status !== "accepted") {
            return next(new ErrorResponse("Order must be accepted before starting delivery", 400));
        }

        shopOrder.status = "out of delivery";
        shopOrder.pickedUpAt = new Date();
        await order.save();

        await DeliveryAssignmentModel.findOneAndUpdate(
            { orderId, shopId },
            { status: "on_delivery" },
        );

        deliveryBoy.status = "on_delivery";
        await deliveryBoy.save();

        return res.status(200).json({
            success: true,
            message: "Delivery started. Driver is now on_delivery.",
            shopOrder,
        });
    } catch (error) {
        next(error);
    }
};

/* ---------------------------------------------
   completeDelivery
   POST /api/order/complete-delivery/:orderId
   Delivery boy verifies OTP with customer and
   completes the delivery. Wallet updated atomically.
--------------------------------------------- */
export const completeDelivery = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const { orderId } = req.params;
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

            const { isEcoEligible, ecoBonus, baseDeliveryFee } = computeEcoBonus({
                vehicleType: deliveryBoy.vehicleType,
            });

            shopOrder.status = "delivered";
            shopOrder.deliveredAt = new Date();
            shopOrder.deliveryOtp = null;
            shopOrder.otpExpires = null;

            assignment.status = "completed";
            assignment.completedAt = new Date();
            assignment.ecoBonusApplied = isEcoEligible;
            await assignment.save({ session });

            const inc = {
                "wallet.earnings": baseDeliveryFee + ecoBonus,
                "wallet.ecoBonusEarnings": ecoBonus,
                "wallet.totalDeliveries": 1,
            };

            await DeliveryBoyModel.updateOne(
                { _id: deliveryBoy._id },
                {
                    $inc: inc,
                    $set: { status: "online" },
                    $unset: { activeOrderId: "" },
                },
                { session },
            );

            await order.save({ session });
        });

        return res.status(200).json({
            success: true,
            message: "Order delivered and wallet updated atomically.",
        });
    } catch (error) {
        return next(error);
    } finally {
        session.endSession();
    }
};
