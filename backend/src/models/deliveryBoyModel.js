import mongoose from "mongoose";

const deliveryBoySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            validate: {
                validator: (v) =>
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase()),
                message: (props) => `${props.value} is not a valid email address`,
            },
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: (v) => {
                    const s = String(v).replace(/\s+/g, "");
                    return /^\+?\d{10,15}$/.test(s);
                },
                message: (props) => `${props.value} is not a valid phone number`,
            },
        },

        status: {
            type: String,
            enum: ["offline", "online", "on_delivery"],
            default: "offline",
            index: true,
        },

        vehicleType: {
            type: String,
            enum: ["Cycle", "EV_Scooter", "Petrol_Bike"],
            required: true,
        },
        vehicleNumber: {
            type: String,
            trim: true,
        },
        drivingLicenseNumber: {
            type: String,
            trim: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
            index: true,
        },

        currentLocation: {
            type: {
                type: String,
                default: "Point",
            },
            coordinates: {
                type: [Number],
                index: "2dsphere",
                default: [0, 0],
                validate: {
                    validator: (v) => Array.isArray(v) && v.length === 2,
                    message: (props) =>
                        `${props.value} must be an array of [lng, lat] with length 2`,
                },
            },
        },

        wallet: {
            earnings: { type: Number, default: 0, min: 0 },
            ecoBonusEarnings: { type: Number, default: 0, min: 0 },
            totalDeliveries: { type: Number, default: 0, min: 0 },
        },
    },
    { timestamps: true },
);

deliveryBoySchema.index({ currentLocation: "2dsphere" });

const DeliveryBoyModel = mongoose.model("DeliveryBoyModel", deliveryBoySchema);

export default DeliveryBoyModel;

