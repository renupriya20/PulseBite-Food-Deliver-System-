import UserModel from "../models/User.model.js";
import ErrorResponse from "../utils/ApiError.util.js";
import { generateToken } from "../utils/jwt.util.js";
import { sendOtpMail } from "../utils/nodemailer.util.js";

export const register = async (req, res, next) => {
  const { fullName, email, password, mobile, role } = req.body;
  try {
    const user = await UserModel.create({
      fullName,
      email,
      password,
      mobile,
      role,
    });

    const token = generateToken(user._id);

    res.cookie("token", token, {
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) return next(new ErrorResponse("Invalid Credentials", 401));

    // const isMatch = await user.comparePassword(password);
    // if (!isMatch) return next(new ErrorResponse("Invalid Credentials", 401));

    const token = generateToken(user._id);
    res.cookie("token", token, {
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res, next) => {
  try {
    res.clearCookie("token", {
      secure: true,
      sameSite: "none",
      maxAge: 0,
      httpOnly: true,
      path: "/",
    });
    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) return next(new ErrorResponse("User not found", 404));

    if (user.otpExpires && user.otpExpires > Date.now()) {
      const remainingTime = Math.max(0, user.otpExpires - Date.now());
      const minutes = Math.floor(remainingTime / 60000);
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      return next(
        new ErrorResponse(
          `Please try again after: ${minutes}m ${seconds}s`,
          429,
        ),
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiryTime = Date.now() + 5 * 60 * 1000;

    user.resetOtp = otp;
    user.otpExpires = otpExpiryTime;
    user.isOtpVerified = false;
    await user.save();

    await sendOtpMail(email, otp);
    console.log("hi");
    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otpExpires: otpExpiryTime,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return next(new ErrorResponse("User not found", 404));

    if (user.isOtpVerified)
      return next(new ErrorResponse("OTP already verified", 400));

    if (!user.otpExpires || user.otpExpires < Date.now()) {
      user.resetOtp = undefined;
      user.otpExpires = undefined;
      user.isOtpVerified = false;
      await user.save();

      return next(new ErrorResponse("OTP expired", 400));
    }

    if (user.resetOtp !== otp)
      return next(new ErrorResponse("Invalid OTP", 400));

    user.isOtpVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return next(new ErrorResponse("User not found", 404));
    if (
      !user.isOtpVerified ||
      !user.otpExpires ||
      user.otpExpires < Date.now()
    ) {
      return next(new ErrorResponse("OTP session expired", 400));
    }

    user.password = password;
    user.isOtpVerified = false;
    user.resetOtp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
  console.log(req.body);
  const { fullName, mobile, email } = req.body;
  try {
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({ fullName, mobile, email, role: "user" });
    }

    const token = generateToken(user._id);
    res.cookie("token", token, {
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};
