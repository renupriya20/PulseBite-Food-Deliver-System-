
import React from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";

const OrderPlaced = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center shadow-inner">
            <FaCheckCircle className="text-orange-500 text-4xl" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Order Placed 🎉
        </h1>

        {/* Subtext */}
        <p className="text-sm text-stone-600 mt-3 leading-relaxed">
          Your order has been successfully placed.
          <br />
          We’re preparing your food and it will be delivered shortly.
        </p>

        {/* Order Card */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mt-8 text-left shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">
              Order ID
            </span>
            <span className="text-sm font-semibold text-stone-800">
              #OK12345
            </span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">
              Estimated Delivery
            </span>
            <span className="text-sm font-semibold text-stone-800">
              25–30 mins
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">
              Payment
            </span>
            <span className="text-sm font-semibold text-green-600">
              Paid ✅
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={() => navigate("/")}
            className="flex-1 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium py-3 rounded-xl text-sm transition-all duration-200 active:scale-[0.98]"
          >
            Go to Home
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-stone-500 mt-6">
          Need help? Contact support anytime.
        </p>
      </div>
    </div>
  );
};

export default OrderPlaced;