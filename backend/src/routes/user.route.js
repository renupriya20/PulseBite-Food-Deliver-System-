import { Router } from "express";
import {
  currentUser,
  toggleOnlineStatus,
  updateLocation,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const userRouter = Router();

userRouter.get("/current-user", authenticate, currentUser);

userRouter.patch(
  "/toggle-online",
  authenticate,
  authorizeRoles("deliveryBoy"),
  toggleOnlineStatus,
);

userRouter.patch(
  "/update-location",
  authenticate,
  authorizeRoles("deliveryBoy"),
  updateLocation,
);

export default userRouter;
