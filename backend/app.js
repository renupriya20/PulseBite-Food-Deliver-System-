import { clerkMiddleware } from "@clerk/express";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { FRONTEND_URL } from "./src/config/index.js";

import { errorHandler } from "./src/middlewares/error.middleware.js";

import authRoutes from "./src/routes/auth.route.js";
import itemRoutes from "./src/routes/item.route.js";
import orderRoutes from "./src/routes/order.route.js";
import shopRoutes from "./src/routes/shop.route.js";
import userRoutes from "./src/routes/user.route.js";
import webhookRouter from "./src/routes/webhook.route.js";
import deliveryRoutes from "./src/routes/delivery.route.js";

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return cb(null, true);

      const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        FRONTEND_URL,
      ].filter(Boolean);
      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(clerkMiddleware());
app.use("/webhook", webhookRouter);

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/shop", shopRoutes);
app.use("/api/v1/item", itemRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/delivery", deliveryRoutes);

app.use(errorHandler);

export default app;
