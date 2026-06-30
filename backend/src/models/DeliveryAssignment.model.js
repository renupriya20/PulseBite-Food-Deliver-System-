import mongoose from "mongoose";

// Keeps 1 document per accepted order+shop, linked to a delivery boy.
// This lets us support room-based customer tracking using a stable activeOrderId.
const deliveryAssignmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    deliveryBoyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["assigned", "picked_up", "on_delivery", "completed", "cancelled"],
      default: "assigned",
      index: true,
    },

    // Room id used for socket targeting.
    // We broadcast telemetry only to rooms tied to this assignment.
    activeOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    ecoBonusApplied: {
      type: Boolean,
      default: false,
    },

    // Location snapshot for dashboard / analytics.
    lastKnownLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], default: [0, 0] },
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// geospatial index for lastKnownLocation (optional)
deliveryAssignmentSchema.index({ lastKnownLocation: "2dsphere" });

const DeliveryAssignmentModel = mongoose.model(
  "DeliveryAssignment",
  deliveryAssignmentSchema,
);

export default DeliveryAssignmentModel;

