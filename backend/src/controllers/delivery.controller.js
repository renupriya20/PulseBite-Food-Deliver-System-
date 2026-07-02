import mongoose from "mongoose";
import DeliveryBoyModel from "../models/DeliveryBoy.model.js";
import DeliveryAssignmentModel from "../models/DeliveryAssignment.model.js";
import OrderModel from "../models/order.model.js";
import ErrorResponse from "../utils/ApiError.util.js";

const BASE_DELIVERY_FEE = 40;
const ECO_BONUS_RATE = 0.15;
const MAX_OTP_ATTEMPTS = 3;
const LOCKOUT_DURATION = 5 * 60 * 1000;

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

// ====================== ACCEPT ORDER ======================
export const acceptOrderV2 = async (req, res, next) => {
  try {
    const { orderId, shopId } = req.params;
    const deliveryBoyUserId = req.user?._id;

    if (!deliveryBoyUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Delivery boy profile find karein
    const deliveryBoy = await DeliveryBoyModel.findOne({ user: deliveryBoyUserId });

    if (!deliveryBoy) {
      return res.status(400).json({
        success: false,
        message: "Please complete onboarding first",
      });
    }

    // 2. Verification & status checks
    if (!deliveryBoy.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Verification required to accept orders",
      });
    }

    if (deliveryBoy.status === "on_delivery") {
      return res.status(400).json({
        success: false,
        message: "You already have an active delivery",
      });
    }

    // 3. Order find karein
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // 4. Shop order find karein
    const shopOrder = order.shopOrders.find((o) => String(o.shop) === String(shopId));
    if (!shopOrder) {
      return res.status(404).json({ success: false, message: "Shop order not found" });
    }

    if (shopOrder.status !== "preparing") {
      return res.status(400).json({ success: false, message: "Order is not ready for pickup" });
    }

    if (shopOrder.assignedDeliveryBoy) {
      return res.status(400).json({ success: false, message: "Order already assigned" });
    }

    // 5. OTP generate karein
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // 6. Database updates
    // NOTE: assignedDeliveryBoy ko hamesha USER id se set karein (deliveryBoy._id se nahi),
    // kyunki verifyCompleteOrderV2 aur getActiveRequests dono req.user._id se compare karte hain.
    shopOrder.assignedDeliveryBoy = deliveryBoyUserId;
    shopOrder.status = "out of delivery";
    shopOrder.deliveryOtp = otp;
    shopOrder.otpExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min (testing/demo ke liye badhaya)

    deliveryBoy.status = "on_delivery";
    deliveryBoy.activeOrderId = orderId;

    await order.save();
    await deliveryBoy.save();

    // 7. Delivery assignment upsert karein
    const assignmentDoc = await DeliveryAssignmentModel.findOneAndUpdate(
      { orderId, shopId },
      {
        orderId,
        shopId,
        deliveryBoyId: deliveryBoyUserId,
        customerId: order.user,
        activeOrderId: orderId,
        status: "on_delivery",
        ecoBonusApplied: false,
      },
      { upsert: true, new: true },
    );

    // DEBUG: confirm assignment actually got created + which DB it landed in
    console.log("=== ASSIGNMENT UPSERT RESULT ===");
    console.log("Connected DB name:", mongoose.connection.name);
    console.log("Assignment doc:", assignmentDoc);
    console.log("================================");

    return res.status(200).json({
      success: true,
      message: "Order accepted successfully!",
      activeOrderId: orderId,
      shopOrder,
      // TESTING ONLY: abhi SMS/email set up nahi hai, isliye OTP yahan bhi bhej rahe hain
      // taaki test karte waqt Compass kholne ki zaroorat na pade.
      // Production mein isko HATA DENA — OTP sirf customer ko SMS/email se jaani chahiye.
      otpForTesting: otp,
    });
  } catch (error) {
    console.error("Accept Order Error:", error);
    next(error);
  }
};

// ====================== VERIFY & COMPLETE ORDER ======================
export const verifyCompleteOrderV2 = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { otp: rawOtp, shopId } = req.body;
    const otp = normalizeOtp(rawOtp);

    if (!otp) return next(new ErrorResponse("4-digit OTP is required", 400));
    if (!shopId) return next(new ErrorResponse("Shop ID is required", 400));

    const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });
    if (!deliveryBoy) return next(new ErrorResponse("Delivery boy not found", 404));

    const assignment = await DeliveryAssignmentModel.findOne({
      orderId,
      shopId,
      deliveryBoyId: req.user._id,
    });

    if (!assignment) return next(new ErrorResponse("Active assignment not found for this shop", 404));

    if (assignment.otpLockUntil && assignment.otpLockUntil > new Date()) {
      const remainingTime = Math.ceil((assignment.otpLockUntil - new Date()) / 1000 / 60);
      return next(
        new ErrorResponse(`Too many wrong attempts. Locked for ${remainingTime} more minutes.`, 403),
      );
    }

    const order = await OrderModel.findById(orderId);
    if (!order) return next(new ErrorResponse("Order not found", 404));

    const shopOrder = order.shopOrders.find(
      (o) => String(o.shop) === String(shopId) && String(o.assignedDeliveryBoy) === String(req.user._id),
    );

    if (!shopOrder) return next(new ErrorResponse("Matching shop order not found for this driver", 404));

    if (shopOrder.status !== "out of delivery") {
      return next(new ErrorResponse("Order not ready for verification", 400));
    }

    if (shopOrder.otpExpires && shopOrder.otpExpires < new Date()) {
      return next(new ErrorResponse("OTP has expired", 400));
    }

    if (normalizeOtp(shopOrder.deliveryOtp) !== otp) {
      assignment.otpAttempts = (assignment.otpAttempts || 0) + 1;

      if (assignment.otpAttempts >= MAX_OTP_ATTEMPTS) {
        assignment.otpLockUntil = new Date(Date.now() + LOCKOUT_DURATION);
        assignment.otpAttempts = 0;
        await assignment.save();
        return next(
          new ErrorResponse(`Wrong OTP. Maximum attempts reached. Account locked for 5 minutes.`, 403),
        );
      }

      await assignment.save();
      const attemptsLeft = MAX_OTP_ATTEMPTS - assignment.otpAttempts;
      return next(new ErrorResponse(`Invalid OTP. You have ${attemptsLeft} attempts left.`, 400));
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
    await assignment.save();

    deliveryBoy.wallet.earnings += baseDeliveryFee + ecoBonus;
    deliveryBoy.wallet.ecoBonusEarnings += ecoBonus;
    deliveryBoy.wallet.totalDeliveries += 1;
    deliveryBoy.status = "online";
    deliveryBoy.activeOrderId = undefined;

    await deliveryBoy.save();
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order delivered and wallet updated.",
    });
  } catch (error) {
    next(error);
  }
};

// ====================== ECO DASHBOARD ======================
export const ecoDashboard = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      dashboard: {
        carbonSavedKg: "4.2",
        greenBonusEarnings: 60,
        walletBalance: 450,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================== GET ACTIVE REQUEST ======================
export const getActiveRequests = async (req, res, next) => {
  try {
    const deliveryBoyId = req.user?._id;

    if (!deliveryBoyId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const order = await OrderModel.findOne({
      "shopOrders.assignedDeliveryBoy": deliveryBoyId,
      "shopOrders.status": { $in: ["preparing", "out of delivery"] },
    })
      .populate("user", "fullName mobile")
      .populate("shopOrders.shop");

    if (!order) {
      return res.status(200).json({
        success: true,
        order: null,
        shopOrder: null,
        message: "No active request found",
      });
    }

    const shopOrder = order.shopOrders.find(
      (so) =>
        String(so.assignedDeliveryBoy) === String(deliveryBoyId) &&
        ["preparing", "out of delivery"].includes(so.status),
    );

    return res.status(200).json({
      success: true,
      order,
      shopOrder,
    });
  } catch (error) {
    console.error("getActiveRequest Error:", error);
    return res.status(200).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ====================== GET AVAILABLE ORDERS ======================
export const getAvailableOrders = async (req, res, next) => {
  try {
    // $elemMatch use kiya taaki status "preparing" aur assignedDeliveryBoy null
    // dono conditions EK HI shopOrder subdocument mein match ho (alag-alag nahi).
    const orders = await OrderModel.find({
      shopOrders: {
        $elemMatch: {
          status: "preparing",
          assignedDeliveryBoy: null,
        },
      },
    }).populate("user", "fullName mobile");

    let availableTasks = [];
    orders.forEach((order) => {
      order.shopOrders.forEach((shopOrder) => {
        if (shopOrder.status === "preparing" && !shopOrder.assignedDeliveryBoy) {
          availableTasks.push({
            order,
            shopOrder,
          });
        }
      });
    });

    return res.status(200).json({
      success: true,
      orders: availableTasks,
    });
  } catch (error) {
    next(error);
  }
};

// ====================== SOS ALERT ======================
export const sosAlert = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "SOS Alert broadcasted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ====================== ECO LEADERBOARD ======================
export const getEcoLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const topPartners = await DeliveryBoyModel.find({ isVerified: true })
      .populate("user", "fullName")
      .sort({ ecoScore: -1 })
      .limit(Number(limit));

    const leaderboard = topPartners.map((dp, index) => ({
      rank: index + 1,
      name: dp.user?.fullName || "Anonymous Rider",
      vehicleType: dp.vehicleType,
      ecoScore: dp.ecoScore || 0,
      safetyRating: dp.safetyRating || 0,
      badge:
        dp.ecoScore >= 500
          ? "🌳 Forest Guardian"
          : dp.ecoScore >= 200
            ? "🌿 Green Champion"
            : dp.ecoScore >= 50
              ? "🌱 Eco Starter"
              : "🚴 New Rider",
    }));

    return res.status(200).json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    next(error);
  }
};

// ====================== GET DELIVERY BOY PROFILE ======================
export const getDeliveryBoyProfile = async (req, res, next) => {
  try {
    const profile = await DeliveryBoyModel.findOne({ user: req.user._id });
    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

// ====================== UPDATE VEHICLE TYPE ======================
export const updateVehicleType = async (req, res, next) => {
  try {
    const { vehicleType } = req.body;
    const profile = await DeliveryBoyModel.findOneAndUpdate(
      { user: req.user._id },
      { vehicleType },
      { new: true },
    );
    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

// ====================== SAVE ONBOARDING DETAILS ======================
export const saveOnboardingDetails = async (req, res, next) => {
  try {
    const { vehicleType, dynamicFields } = req.body;
    const profile = await DeliveryBoyModel.findOneAndUpdate(
      { user: req.user._id },
      { vehicleType, isVerified: true, ...dynamicFields },
      { new: true, upsert: true },
    );
    return res.status(200).json({
      success: true,
      message: "Onboarding details saved successfully",
      profile,
    });
  } catch (error) {
    next(error);
  }
};

// ====================== TOGGLE DELIVERY STATUS ======================
export const toggleDeliveryStatus = async (req, res, next) => {
  try {
    const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });
    if (!deliveryBoy) throw new ErrorResponse("Delivery boy profile not found", 404);

    deliveryBoy.status = deliveryBoy.status === "offline" ? "online" : "offline";
    await deliveryBoy.save();

    return res.status(200).json({
      success: true,
      message: `Status updated to ${deliveryBoy.status}`,
      status: deliveryBoy.status,
    });
  } catch (error) {
    next(error);
  }
};