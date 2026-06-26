import { Router } from "express";
import {
  acceptDeliveryOrder,
  assignDeliveryBoy,
  completeDelivery,
  getOnlineDeliveryBoys,
  getOrders,
  placeOrder,
  startDelivery,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const orderRouter = Router();

orderRouter.post("/place", authenticate, placeOrder);

orderRouter.get("/orders", authenticate, getOrders);

orderRouter.patch(
  "/update-status/:orderId/:shopId",
  authenticate,
  authorizeRoles("owner"),
  updateOrderStatus,
);

orderRouter.post(
  "/accept/:orderId/:shopId",
  authenticate,
  authorizeRoles("deliveryBoy"),
  acceptDeliveryOrder,
);

orderRouter.patch(
  "/start-delivery/:orderId/:shopId",
  authenticate,
  authorizeRoles("deliveryBoy"),
  startDelivery,
);

orderRouter.patch(
  "/complete-delivery/:orderId/:shopId",
  authenticate,
  authorizeRoles("deliveryBoy"),
  completeDelivery,
);

orderRouter.post(
  "/assign/:orderId/:shopId/:deliveryBoyId",
  authenticate,
  authorizeRoles("owner"),
  assignDeliveryBoy,
);

orderRouter.get(
  "/online-delivery-boys",
  authenticate,
  authorizeRoles("owner"),
  getOnlineDeliveryBoys,
);

export default orderRouter;
