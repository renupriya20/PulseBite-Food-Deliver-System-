import DeliveryBoyModel from "../models/DeliveryBoy.model.js";
import DeliveryAssignmentModel from "../models/DeliveryAssignment.model.js";
import OrderModel from "../models/order.model.js";
import UserModel from "../models/User.model.js";
import ErrorResponse from "../utils/ApiError.util.js";
import { sendDeliveryOtpMail } from "../utils/nodemailer.util.js";

// --- helpers ---
const toFixed = (n, digits = 2) => {
  const num = Number(n);
  if (Number.isNaN(num)) return 0;
  return Number(num.toFixed(digits));
};

const generateOtp = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

const computeEcoImpact = ({ vehicleType, distanceKm }) => {
  // Simple production-minded heuristic with deterministic output.
  // Carbon saved: higher for non-petrol vehicles.
  // You can tune values later from config/env.
  const d = Math.max(0, Number(distanceKm) || 0);

  const co2PerKm = {
    Petrol_Bike: 0.09,
    EV_Scooter: 0.02,
    Cycle: 0.0,
  };

  const baseline = co2PerKm.Petrol_Bike;
  const actual = co2PerKm[vehicleType] ?? co2PerKm.Petrol_Bike;
  const carbonSavedKg = Math.max(0, (baseline - actual) * d);

  // "Fuel saved" is conceptual: EV/Cycle return 0, Petrol returns 0 savings.
  // For dashboard, we keep it numeric and consistent.
  const fuelSavedLiters = vehicleType === "Petrol_Bike" ? 0 : d * 0.02;

  return {
    distanceKm: toFixed(d, 2),
    carbonSavedKg: toFixed(carbonSavedKg, 2),
    fuelSavedLiters: toFixed(fuelSavedLiters, 2),
    // EcoScore reward uses carbonSavedKg + safetyRating baseline.
    ecoScoreDelta: toFixed(Math.min(100, carbonSavedKg * 5), 1),
  };
};

const broadcastIfSocketExists = async (io, event, payload) => {
  if (!io) return;
  io.to(payload?.roomId).emit(event, payload);
};

// --- 1) onboarding-details ---
export const saveOnboardingDetails = async (req, res, next) => {
  try {
    const deliveryBoyUserId = req.user._id;

    const {
      vehicleType,
      vehicleNumber,
      drivingLicenseNumber,
      governmentIdUrl,
    } = req.body;

    if (!vehicleType || !vehicleNumber || !drivingLicenseNumber) {
      return next(new ErrorResponse("Vehicle details are required", 400));
    }
    if (!governmentIdUrl) {
      return next(new ErrorResponse("governmentIdUrl is required", 400));
    }

    const updated = await DeliveryBoyModel.findOneAndUpdate(
      { user: deliveryBoyUserId },
      {
        vehicleType,
        vehicleNumber,
        drivingLicenseNumber,
        governmentIdUrl,
        // onboarding sets verified false (explicit requirement)
        isVerified: false,
      },
      { new: true, upsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Onboarding details saved. Verification pending.",
      deliveryBoy: updated,
    });
  } catch (error) {
    next(error);
  }
};

// --- 2) delivery/status (duty toggle) ---
export const toggleDeliveryStatus = async (req, res, next) => {
  try {
    if (req.user.role !== "deliveryBoy") {
      return next(new ErrorResponse("Only delivery partners allowed", 403));
    }

    const { status } = req.body; // {status:'online'|'offline'...}
    if (!status || !["offline", "online", "on_delivery"].includes(status)) {
      return next(
        new ErrorResponse("status must be one of offline|online|on_delivery", 400),
      );
    }

    const deliveryBoy = await DeliveryBoyModel.findOne({
      user: req.user._id,
    });

    if (!deliveryBoy) {
      return next(new ErrorResponse("Please complete onboarding first", 400));
    }

    // block online/on_delivery if not verified
    if (!deliveryBoy.isVerified && status !== "offline") {
      return next(
        new ErrorResponse(
          "Verification required before going online or on delivery",
          403,
        ),
      );
    }

    // If deliveryBoy is not verified, only offline allowed.
    deliveryBoy.status = status;
    await deliveryBoy.save();

    // also keep legacy isOnline flag in User model for existing UI.
    // Map: online => true, offline => false, on_delivery => true
    const nextIsOnline = status === "online" || status === "on_delivery";
    await UserModel.findByIdAndUpdate(req.user._id, {
      isOnline: nextIsOnline,
      socketId: req.user.socketId,
      location: req.user.location,
    });

    return res.status(200).json({
      success: true,
      message: `Delivery status updated to ${status}`,
      deliveryBoy,
    });
  } catch (error) {
    next(error);
  }
};

// --- 3) SOS alert ---
export const sosAlert = async (req, res, next) => {
  try {
    const { orderId, latitude, longitude, reason } = req.body;

    if (latitude == null || longitude == null) {
      return next(new ErrorResponse("latitude and longitude are required", 400));
    }

    const deliveryBoy = await DeliveryBoyModel.findOne({
      user: req.user._id,
    });

    if (!deliveryBoy) {
      return next(new ErrorResponse("Delivery boy profile not found", 404));
    }

    // Persist lightweight SOS stats.
    deliveryBoy.sosCount += 1;
    deliveryBoy.lastSosAt = new Date();
    await deliveryBoy.save();

    const payload = {
      event: "SOS_ALERT",
      roomId: orderId ? `customer:${orderId}` : "admin",
      orderId: orderId || null,
      deliveryBoyId: req.user._id,
      deliveryBoyName: req.user.fullName,
      coordinates: {
        latitude,
        longitude,
      },
      reason: reason || "SOS",
      createdAt: new Date().toISOString(),
    };

    // io is attached on req.app.locals by socket bootstrap
    const io = req.app?.locals?.io;
    if (io) {
      // Always broadcast to admin room
      io.to("admin").emit("SOS_ALERT", payload);
      // Also broadcast to customer room if we know orderId
      if (orderId) io.to(`customer:${orderId}`).emit("SOS_ALERT", payload);
    }

    return res.status(200).json({
      success: true,
      message: "SOS alert sent",
    });
  } catch (error) {
    next(error);
  }
};

// --- 4) eco-dashboard ---
export const ecoDashboard = async (req, res, next) => {
  try {
    const { vehicleTypeOverride, distanceKm } = req.query;

    const deliveryBoy = await DeliveryBoyModel.findOne({
      user: req.user._id,
    });

    const vehicleType = vehicleTypeOverride || deliveryBoy?.vehicleType;

    if (!vehicleType) {
      return next(new ErrorResponse("Vehicle type missing", 400));
    }

    const impact = computeEcoImpact({
      vehicleType,
      distanceKm: distanceKm ?? 12, // default heuristic for dashboard
    });

    // Earnings approximation from assignment completions.
    const completedAssignments = await DeliveryAssignmentModel.countDocuments({
      deliveryBoyId: req.user._id,
      status: "completed",
    });

    // use stored wallet as source of truth if present
    const wallet = deliveryBoy.instantEarningsWallet || 0;

    return res.status(200).json({
      success: true,
      message: "Eco dashboard fetched",
      dashboard: {
        vehicleType,
        distanceKm: impact.distanceKm,
        carbonSavedKg: impact.carbonSavedKg,
        fuelSavedLiters: impact.fuelSavedLiters,
        ecoScoreDelta: impact.ecScoreDelta,
        greenBonusEarnings: toFixed(impact.ecoScoreDelta * 0.6, 2),
        walletBalance: toFixed(wallet, 2),
        completedTrips: completedAssignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --- 5) order lifecycle extensions ---
export const acceptOrderV2 = async (req, res, next) => {
  try {
    const { orderId, shopId } = req.params;

    // Block if not verified
    const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });

    if (!deliveryBoy) {
      return next(new ErrorResponse("Please complete onboarding", 400));
    }

    if (!deliveryBoy.isVerified) {
      return next(
        new ErrorResponse("Verification required to accept orders", 403),
      );
    }

    // locate shopOrder
    const order = await OrderModel.findById(orderId).populate(
      "user",
      "fullName mobile email"
    );
    if (!order) return next(new ErrorResponse("Order not found", 404));

    const shopOrder = order.shopOrders.find(
      (o) => o.shop.toString() === shopId.toString(),
    );

    if (!shopOrder) {
      return next(new ErrorResponse("Shop order not found", 404));
    }

    if (shopOrder.status !== "preparing") {
      return next(new ErrorResponse("Order is not ready for pickup", 400));
    }

    if (shopOrder.assignedDeliveryBoy) {
      return next(new ErrorResponse("Order already assigned", 400));
    }

    // Spec mapping:
    // - Order -> Picked_Up (we map to existing enum: "out of delivery" since v1 uses it for pickup->otp)
    // - Driver -> on_delivery (assignment status)
    shopOrder.assignedDeliveryBoy = req.user._id;
    shopOrder.status = "out of delivery";

    // Generate secure 4-digit OTP for customer completion
    const otp = generateOtp();
    shopOrder.deliveryOtp = otp;
    shopOrder.otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    if (order.user?.email) {
      await sendDeliveryOtpMail(order.user, otp);
    }

    const activeOrderId = String(orderId);

    await DeliveryAssignmentModel.findOneAndUpdate(
      { orderId: orderId, shopId: shopId },
      {
        orderId,
        shopId,
        deliveryBoyId: req.user._id,
        customerId: order.user?._id,
        activeOrderId,
        status: "on_delivery",
        ecoBonusApplied: false,
        lastKnownLocation: {
          type: "Point",
          coordinates: [
            req.user.location?.coordinates?.[0] ?? 0,
            req.user.location?.coordinates?.[1] ?? 0,
          ],
        },
      },
      { upsert: true, new: true },
    );

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order accepted. Customer OTP generated.",
      shopOrder,
      activeOrderId,
      // helpful for UI testing; remove in production if you want strict secrecy
      otpHintForDriverUI: otp,
    });
  } catch (error) {
    next(error);
  }
};


export const verifyCompleteOrderV2 = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { otp } = req.body;

    if (!otp || String(otp).length !== 4) {
      return next(new ErrorResponse("4-digit OTP is required", 400));
    }

    const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });
    if (!deliveryBoy) {
      return next(new ErrorResponse("Delivery boy not found", 404));
    }

    const assignment = await DeliveryAssignmentModel.findOne({
      orderId,
      deliveryBoyId: req.user._id,
    });

    if (!assignment) {
      return next(new ErrorResponse("Active assignment not found", 404));
    }

    const order = await OrderModel.findById(orderId);
    if (!order) return next(new ErrorResponse("Order not found", 404));

    const shopOrder = order.shopOrders.find(
      (o) => String(o.assignedDeliveryBoy) === String(req.user._id),
    );

    if (!shopOrder) return next(new ErrorResponse("Shop order not found", 404));

    if (shopOrder.status !== "out of delivery") {
      return next(new ErrorResponse("Order not ready for verification", 400));
    }

    if (String(shopOrder.deliveryOtp) !== String(otp)) {
      return next(new ErrorResponse("Invalid OTP", 400));
    }

    if (shopOrder.otpExpires && shopOrder.otpExpires < new Date()) {
      return next(new ErrorResponse("OTP has expired", 400));
    }

    // Eco-bonus transaction
    const baseDeliveryFee = 40; // deterministic; replace with real calc later
    const isEcoEligible = ["Cycle", "EV_Scooter"].includes(deliveryBoy.vehicleType);
    const ecoBonus = isEcoEligible ? baseDeliveryFee * 0.15 : 0;
    const totalWalletAdd = baseDeliveryFee + ecoBonus;

    assignment.status = "completed";
    assignment.completedAt = new Date();
    assignment.ecoBonusApplied = isEcoEligible;
    await assignment.save();

    // Wallet + metrics
    deliveryBoy.instantEarningsWallet += totalWalletAdd;
    deliveryBoy.ecoScore += isEcoEligible ? 15 : 5;

    const safetyDelta = deliveryBoy.sosCount > 0 ? 2 : 6;
    deliveryBoy.safetyRating = Math.min(
      100,
      deliveryBoy.safetyRating + safetyDelta,
    );

    // Spec: reset status to 'online' after completion
    deliveryBoy.status = "online";
    await deliveryBoy.save();

    await UserModel.findByIdAndUpdate(req.user._id, { isOnline: true });

    // update order state
    shopOrder.status = "delivered";
    shopOrder.deliveredAt = new Date();
    shopOrder.deliveryOtp = null;
    shopOrder.otpExpires = null;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Delivery verified & completed. Eco-Bonus applied if eligible.",
      walletAdded: totalWalletAdd,
      ecoBonus,
      baseDeliveryFee,
    });
  } catch (error) {
    next(error);
  }
};


