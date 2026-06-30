import DeliveryBoyModel from "../models/DeliveryBoy.model.js";
import DeliveryAssignmentModel from "../models/DeliveryAssignment.model.js";
import OrderModel from "../models/order.model.js";
import ErrorResponse from "../utils/ApiError.util.js";

const validateStatus = (status) => {
  if (!status) return false;
  return ["offline", "online"].includes(status);
};

const toLngLat = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [lng, lat] = coordinates;
  const lngNum = Number(lng);
  const latNum = Number(lat);
  if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) return null;
  return [lngNum, latNum];
};

export const updateDutyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!validateStatus(status)) {
      return next(new ErrorResponse("status must be either 'online' or 'offline'", 400));
    }

    const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });

    if (!deliveryBoy) {
      return next(new ErrorResponse("Delivery boy profile not found", 404));
    }

    // Requirement: Returns error if driver is not verified.
    if (!deliveryBoy.isVerified && status !== "offline") {
      return next(new ErrorResponse("Verification required before going online", 403));
    }

    deliveryBoy.status = status;
    await deliveryBoy.save();

    return res.status(200).json({
      success: true,
      message: `Duty status updated to ${status}`,
      status: deliveryBoy.status,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLiveLocation = async (req, res, next) => {
  try {
    const { coordinates } = req.body; // [lng, lat]
    const lngLat = toLngLat(coordinates);

    if (!lngLat) {
      return next(new ErrorResponse("coordinates must be [lng, lat]", 400));
    }

    const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });

    if (!deliveryBoy) {
      return next(new ErrorResponse("Delivery boy profile not found", 404));
    }

    deliveryBoy.currentLocation = {
      type: "Point",
      coordinates: lngLat,
    };

    await deliveryBoy.save();

    return res.status(200).json({
      success: true,
      message: "Live location updated",
      currentLocation: deliveryBoy.currentLocation,
    });
  } catch (error) {
    next(error);
  }
};

export const getDriverDashboard = async (req, res, next) => {
  try {
    const deliveryBoy = await DeliveryBoyModel.findOne({ user: req.user._id });

    if (!deliveryBoy) {
      return next(new ErrorResponse("Delivery boy profile not found", 404));
    }

    // Aggregate wallet + profile + completed orders metadata.
    const assignmentsAgg = await DeliveryAssignmentModel.aggregate([
      {
        $match: {
          deliveryBoyId: req.user._id,
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$deliveryBoyId",
          completedOrdersCount: { $sum: 1 },
          lastCompletedAt: { $max: "$completedAt" },
        },
      },
    ]);

    const meta = assignmentsAgg?.[0] || {
      completedOrdersCount: 0,
      lastCompletedAt: null,
    };

    return res.status(200).json({
      success: true,
      message: "Driver dashboard fetched",
      profile: {
        name: deliveryBoy.name,
        email: deliveryBoy.email,
        phone: deliveryBoy.phone,
        vehicleType: deliveryBoy.vehicleType,
        vehicleNumber: deliveryBoy.vehicleNumber,
        drivingLicenseNumber: deliveryBoy.drivingLicenseNumber,
        status: deliveryBoy.status,
        isVerified: deliveryBoy.isVerified,
        currentLocation: deliveryBoy.currentLocation,
      },
      wallet: {
        earnings: deliveryBoy.wallet?.earnings ?? 0,
        ecoBonusEarnings: deliveryBoy.wallet?.ecoBonusEarnings ?? 0,
        totalDeliveries: deliveryBoy.wallet?.totalDeliveries ?? 0,
      },
      completedOrdersMeta: {
        completedOrdersCount: meta.completedOrdersCount,
        lastCompletedAt: meta.lastCompletedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

