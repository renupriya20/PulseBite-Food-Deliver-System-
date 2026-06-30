import React from "react";
import { AuthLoader } from "./AuthLoader";

// Wrapper for order pages branding loader
const OrderKaroPulseLoader = () => {
    return (
        <div className="min-h-screen w-full bg-white flex items-center justify-center">
            <AuthLoader />
        </div>
    );
};

export default OrderKaroPulseLoader;

