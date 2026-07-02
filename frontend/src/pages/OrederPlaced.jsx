import { FaCheckCircle } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

function formatOrderId(id) {
  if (!id) return "#OK------";
  return `#OK${String(id).slice(-6).toUpperCase()}`;
}

function paymentLabel(method, paid) {
  if (method === "cod") return "Cash on Delivery";
  return paid ? "Paid online ✅" : "Online (pending)";
}

const OrderPlaced = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const order = state?.order;

  const orderId = formatOrderId(order?._id);
  const payment = order
    ? paymentLabel(order.paymentMethod, order.payment === true)
    : "Cash on Delivery";
  const total = order?.totalAmount != null ? `₹${order.totalAmount}` : "—";
  const shopNames =
    order?.shopOrders
      ?.map((s) => s.shop?.name)
      .filter(Boolean)
      .join(", ") || "Your restaurants";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center shadow-inner">
            <FaCheckCircle className="text-orange-500 text-4xl" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Order Placed 🎉
        </h1>

        <p className="text-sm text-stone-600 mt-3 leading-relaxed">
          Your order has been successfully placed.
          <br />
          We’re preparing your food and it will be delivered shortly.
        </p>

        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mt-8 text-left shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">
              Order ID
            </span>
            <span className="text-sm font-semibold text-stone-800">
              {orderId}
            </span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">
              Restaurants
            </span>
            <span className="text-sm font-semibold text-stone-800 text-right max-w-[55%] truncate">
              {shopNames}
            </span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">
              Total
            </span>
            <span className="text-sm font-semibold text-orange-600">
              {total}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">
              Payment
            </span>
            <span
              className={`text-sm font-semibold ${order?.paymentMethod === "cod"
                ? "text-stone-700"
                : order?.payment
                  ? "text-green-600"
                  : "text-amber-600"
                }`}
            >
              {payment}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex-1 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium py-3 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            Go to Home
          </button>
        </div>

        <p className="text-xs text-stone-500 mt-6">
          View all orders anytime from <strong>My Orders</strong> in the navbar.
        </p>
      </div>
    </div>
  );
};

export default OrderPlaced;
