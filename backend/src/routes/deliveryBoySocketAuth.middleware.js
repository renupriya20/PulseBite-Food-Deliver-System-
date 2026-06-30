import ErrorResponse from "../utils/ApiError.util.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET_KEY } from "../config/index.js";
import UserModel from "../models/User.model.js";

// Optional helper to authenticate socket connections.
// The current app uses cookie-based auth; socket cannot read httpOnly cookie automatically,
// so clients should send a JWT token in handshake.auth.token.
export const socketAuthenticate = async (socket, next) => {
  try {
    const token = socket?.handshake?.auth?.token;
    if (!token) return next(new ErrorResponse("Socket auth token required", 401));

    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    const user = await UserModel.findById(decoded?.payload);
    if (!user) return next(new ErrorResponse("Invalid socket auth", 401));

    socket.user = user;
    return next();
  } catch (e) {
    return next(new ErrorResponse("Socket auth failed", 401));
  }
};

