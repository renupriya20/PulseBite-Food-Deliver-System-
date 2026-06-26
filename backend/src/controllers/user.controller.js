import UserModel from "../models/User.model.js";
import ErrorResponse from "../utils/ApiError.util.js";

export const currentUser = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "User Profile Fetched Successfully",
    user: req.user,
  });
};

export const toggleOnlineStatus = async (req, res, next) => {
  try {
    if (req.user.role !== "deliveryBoy") {
      return next(new ErrorResponse("Only delivery partners can go online", 403));
    }

    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      { isOnline: !req.user.isOnline },
      { new: true },
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: user.isOnline ? "You are now online" : "You are now offline",
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;

    if (req.user.role !== "deliveryBoy") {
      return next(new ErrorResponse("Only delivery partners can update location", 403));
    }

    if (latitude == null || longitude == null) {
      return next(new ErrorResponse("Latitude and longitude are required", 400));
    }

    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      {
        location: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
      { new: true },
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Location updated",
      user,
    });
  } catch (error) {
    next(error);
  }
};
