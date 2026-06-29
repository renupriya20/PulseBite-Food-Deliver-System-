import OrderModel from "../models/order.model.js";
import ShopModel from "../models/Shop.model.js";
import UserModel from "../models/User.model.js";
import ErrorResponse from "../utils/ApiError.util.js";
import { sendDeliveryOtpMail } from "../utils/nodemailer.util.js";

const generateOtp = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

const formatDeliveryOrders = (orders, filterFn) => {
  return orders
    .map((order) => ({
      _id: order._id,
      user: order.user,
      paymentMethod: order.paymentMethod,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      shopOrders: order.shopOrders.filter(filterFn),
    }))
    .filter((order) => order.shopOrders.length > 0);
};

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

// let groupItemsByShop = {
//   dominoesId: [itemId1, itemId2, item2],
//   pizzaHutId: [itemId3],
// };

export const getOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let orders = [];

    if (req.user.role === "user") {
      orders = await OrderModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .populate("shopOrders.shop", "name")
        .populate("shopOrders.owner", "name email mobile")
        .populate(
          "shopOrders.assignedDeliveryBoy",
          "fullName mobile location"
        )
        .populate("shopOrders.shopOrderItems.item", "name image price");
    }

    if (req.user.role === "owner") {
      orders = await OrderModel.find({ "shopOrders.owner": userId })
        .sort({ createdAt: -1 })
        .populate("shopOrders.shop", "name")
        .populate("user", "fullName email mobile")
        .populate("shopOrders.assignedDeliveryBoy", "fullName mobile location")
        .populate("shopOrders.shopOrderItems.item", "name image price");

      // keep only this owner's shopOrders
      orders = orders.map((order) => ({
        _id: order._id,
        paymentMethod: order.paymentMethod,
        user: order.user,
        createdAt: order.createdAt,
        shopOrders: order.shopOrders.filter(
          (o) => o.owner.toString() === userId.toString(),
        ),
        deliveryAddress: order.deliveryAddress,
      }));
    }

    if (req.user.role === "deliveryBoy") {
      const allOrders = await OrderModel.find({
        $or: [
          { "shopOrders.assignedDeliveryBoy": userId },
          {
            "shopOrders.status": "preparing",
            "shopOrders.assignedDeliveryBoy": null,
          },
        ],
      })
        .sort({ createdAt: -1 })
        .populate("shopOrders.shop", "name address city")
        .populate("user", "fullName mobile email")
        .populate("shopOrders.shopOrderItems.item", "name image price");

      const available = formatDeliveryOrders(
        allOrders,
        (o) =>
          o.status === "preparing" && !o.assignedDeliveryBoy,
      );

      const myOrders = formatDeliveryOrders(
        allOrders,
        (o) =>
          o.assignedDeliveryBoy &&
          o.assignedDeliveryBoy.toString() === userId.toString(),
      );

      return res.status(200).json({
        success: true,
        message: "Delivery orders fetched successfully",
        available,
        myOrders,
      });
    }

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No orders found",
        orders: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      orders,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId, shopId } = req.params;
    const { status } = req.body;

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return next(new ErrorResponse("Order Not Found", 404));
    }

    const shopOrder = order.shopOrders.find(
      (o) => o.shop.toString() === shopId.toString(),
    );

    if (!shopOrder) {
      return next(new ErrorResponse("Shop Order Not Found", 404));
    }

    if (shopOrder.owner.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("Not authorized to update this order", 403));
    }

    shopOrder.status = status;

    if (status === "delivered") {
      shopOrder.deliveredAt = new Date();
    }

    if (status === "out of delivery") {
      const otp = generateOtp();
      shopOrder.deliveryOtp = otp;
      shopOrder.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

      const customer = await UserModel.findById(order.user);
      if (customer) {
        await sendDeliveryOtpMail(customer, otp);
      }
    }

    await order.save();

    //  populate from parent, NOT from subdocument
    await order.populate("shopOrders.shopOrderItems.item", "name image price");

    return res.status(200).json({
      success: true,
      message: "Status updated",
      shopOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptDeliveryOrder = async (req, res, next) => {
  try {
    const { orderId, shopId } = req.params;

    if (!req.user.isOnline) {
      return next(
        new ErrorResponse("Go online to accept delivery orders", 400),
      );
    }

    const order = await OrderModel.findById(orderId).populate("user", "fullName mobile");
    if (!order) {
      return next(new ErrorResponse("Order not found", 404));
    }

    const shopOrder = order.shopOrders.find(
      (o) => o.shop.toString() === shopId.toString(),
    );

    if (!shopOrder) {
      return next(new ErrorResponse("Shop order not found", 404));
    }

    if (shopOrder.status !== "preparing") {
      return next(
        new ErrorResponse("Order is not ready for pickup", 400),
      );
    }

    if (shopOrder.assignedDeliveryBoy) {
      return next(new ErrorResponse("Order already assigned", 400));
    }

    shopOrder.assignedDeliveryBoy = req.user._id;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      shopOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const startDelivery = async (req, res, next) => {
  try {
    const { orderId, shopId } = req.params;

    const order = await OrderModel.findById(orderId).populate("user", "email fullName");
    if (!order) {
      return next(new ErrorResponse("Order not found", 404));
    }

    const shopOrder = order.shopOrders.find(
      (o) => o.shop.toString() === shopId.toString(),
    );

    if (!shopOrder) {
      return next(new ErrorResponse("Shop order not found", 404));
    }

    if (
      !shopOrder.assignedDeliveryBoy ||
      shopOrder.assignedDeliveryBoy.toString() !== req.user._id.toString()
    ) {
      return next(new ErrorResponse("This order is not assigned to you", 403));
    }

    if (shopOrder.status !== "preparing") {
      return next(
        new ErrorResponse("Order cannot be picked up in current status", 400),
      );
    }

    const otp = generateOtp();
    shopOrder.status = "out of delivery";
    shopOrder.deliveryOtp = otp;
    shopOrder.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await order.save();

    if (order.user) {
      await sendDeliveryOtpMail(order.user, otp);
    }

    return res.status(200).json({
      success: true,
      message: "Delivery started. OTP sent to customer.",
      shopOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const completeDelivery = async (req, res, next) => {
  try {
    const { orderId, shopId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return next(new ErrorResponse("Delivery OTP is required", 400));
    }

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return next(new ErrorResponse("Order not found", 404));
    }

    const shopOrder = order.shopOrders.find(
      (o) => o.shop.toString() === shopId.toString(),
    );

    if (!shopOrder) {
      return next(new ErrorResponse("Shop order not found", 404));
    }

    if (
      !shopOrder.assignedDeliveryBoy ||
      shopOrder.assignedDeliveryBoy.toString() !== req.user._id.toString()
    ) {
      return next(new ErrorResponse("This order is not assigned to you", 403));
    }

    if (shopOrder.status !== "out of delivery") {
      return next(new ErrorResponse("Order is not out for delivery", 400));
    }

    if (shopOrder.deliveryOtp !== otp) {
      return next(new ErrorResponse("Invalid OTP", 400));
    }

    if (shopOrder.otpExpires && shopOrder.otpExpires < new Date()) {
      return next(new ErrorResponse("OTP has expired", 400));
    }

    shopOrder.status = "delivered";
    shopOrder.deliveredAt = new Date();
    shopOrder.deliveryOtp = null;
    shopOrder.otpExpires = null;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order delivered successfully",
      shopOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const assignDeliveryBoy = async (req, res, next) => {
  try {
    const { orderId, shopId, deliveryBoyId } = req.params;

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return next(new ErrorResponse("Order not found", 404));
    }

    const shopOrder = order.shopOrders.find(
      (o) => o.shop.toString() === shopId.toString(),
    );

    if (!shopOrder) {
      return next(new ErrorResponse("Shop order not found", 404));
    }

    if (shopOrder.owner.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse("Not authorized to assign this order", 403));
    }

    if (shopOrder.status !== "preparing") {
      return next(
        new ErrorResponse("Order must be in preparing status to assign", 400),
      );
    }

    const deliveryBoy = await UserModel.findOne({
      _id: deliveryBoyId,
      role: "deliveryBoy",
      isOnline: true,
    });

    if (!deliveryBoy) {
      return next(
        new ErrorResponse("Delivery partner not found or offline", 404),
      );
    }

    shopOrder.assignedDeliveryBoy = deliveryBoy._id;
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Delivery partner assigned successfully",
      shopOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const getOnlineDeliveryBoys = async (req, res, next) => {
  try {
    const deliveryBoys = await UserModel.find({
      role: "deliveryBoy",
      isOnline: true,
    }).select("fullName mobile email isOnline");

    return res.status(200).json({
      success: true,
      message: "Online delivery partners fetched",
      deliveryBoys,
    });
  } catch (error) {
    next(error);
  }
};
