import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
    acceptOrderV2,
    ecoDashboard,
    saveOnboardingDetails,
    sosAlert,
    toggleDeliveryStatus,
    verifyCompleteOrderV2,
} from "../controllers/delivery.controller.js";

const deliveryRouter = Router();

deliveryRouter.post(
    "/onboarding-details",
    authenticate,
    authorizeRoles("deliveryBoy"),
    saveOnboardingDetails,
);

// Toggle duty status
deliveryRouter.put(
    "/status",
    authenticate,
    authorizeRoles("deliveryBoy"),
    toggleDeliveryStatus,
);

deliveryRouter.post(
    "/sos-alert",
    authenticate,
    authorizeRoles("deliveryBoy"),
    sosAlert,
);

deliveryRouter.get(
    "/eco-dashboard",
    authenticate,
    authorizeRoles("deliveryBoy"),
    ecoDashboard,
);

// Order lifecycle v2
// NOTE: Order model uses route structure currently in order.route.js.
// We'll add these endpoints alongside existing ones.
deliveryRouter.put(
    "/order/:id/accept",
    authenticate,
    authorizeRoles("deliveryBoy"),
    acceptOrderV2,
);

deliveryRouter.post(
    "/order/:id/verify-complete",
    authenticate,
    authorizeRoles("deliveryBoy"),
    verifyCompleteOrderV2,
);

export default deliveryRouter;

