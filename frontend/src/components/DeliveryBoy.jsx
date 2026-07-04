import { useCallback, useEffect, useState } from "react";
import { FaBoxOpen, FaLocationDot, FaPowerOff } from "react-icons/fa6";
import { FaPhone, FaRoute, FaSms } from "react-icons/fa";
import { MdOutlineHowToReg } from "react-icons/md";
import deliveryBoyLogo from "../assets/scooter.png";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { ORDER_ROUTES, USER_ROUTES } from "../constants/endpoints";
import axiosInstance from "../lib/axios";
import { setUserData } from "../redux/slices/userSlice";
import Navbar from "./Navbar";
import SmsSupportButton from "./SmsSupportButton";


const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  "out of delivery": "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
};

function StatusTimeline({ status }) {
  const steps = [
    { key: "pending", label: "Pending", dot: "bg-yellow-500" },
    { key: "preparing", label: "Preparing", dot: "bg-blue-500" },
    { key: "out of delivery", label: "Out for delivery", dot: "bg-orange-500" },
    { key: "delivered", label: "Delivered", dot: "bg-green-500" },
  ];

  const idx = steps.findIndex((s) => s.key === status);

  return (
    <div className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => {
          const done = i <= idx && idx !== -1;
          return (
            <div key={s.key} className="flex flex-col items-center flex-1">
              <div
                className={`w-2.5 h-2.5 rounded-full ${done ? s.dot : "bg-stone-300"}`}
              />
              <p
                className={`text-[10px] font-semibold mt-1 text-center ${done ? "text-stone-900" : "text-stone-400"}`}
              >
                {s.label}
              </p>
              {i < steps.length - 1 && (
                <div
                  className={`w-full h-0.5 mt-2 -mb-1 ${done ? "bg-stone-900" : "bg-stone-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order, shopOrder, type, onAction }) {
  const [otp, setOtp] = useState("");
  const shop = shopOrder.shop;
  const shopId = shop?._id || shopOrder.shop;

  // NOTE: keep only variables used in JSX to satisfy eslint.


  const customerPhone = order?.user?.mobile;
  const customerCallHref = customerPhone
    ? `tel:${String(customerPhone).replace(/[^0-9+]/g, "")}`
    : null;

  const addressText = order?.deliveryAddress?.text || "";
  const mapsHref = addressText
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`
    : null;

  const canAccept = type === "available";
  const canStart = type === "my" && shopOrder.status === "preparing";
  const canComplete = type === "my" && shopOrder.status === "out of delivery";

  return (
    <div className="w-full bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">

      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-1">
            {shop?.name || "Restaurant"}
          </p>
          <h3 className="text-sm font-bold text-stone-900">
            Order #{order._id.slice(-6).toUpperCase()}
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_COLORS[shopOrder.status] || "bg-stone-100 text-stone-600"}`}
        >
          {shopOrder.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {shopOrder.shopOrderItems?.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-stone-600">
              {item.name} × {item.quantity}
            </span>
            <span className="font-medium text-stone-800">
              ₹{item.price * item.quantity}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-stone-100 pt-4 space-y-3">
        <div className="flex items-start gap-2 text-sm text-stone-600">
          <FaLocationDot className="text-orange-500 mt-0.5 shrink-0" />
          <span>{order.deliveryAddress?.text}</span>
        </div>

        {order.user && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-stone-500 truncate">
                Customer: {order.user.fullName} · {order.user.mobile}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Keep OTP ready for completion
              </p>

              <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                <span className="text-[11px] font-semibold">
                  Eco-Bonus Eligible (+15%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {customerCallHref && (
                <a
                  href={customerCallHref}
                  className="w-9 h-9 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-500 flex items-center justify-center"
                  title="Call customer"
                  aria-label="Call customer"
                >
                  <FaPhone size={16} />
                </a>
              )}

              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 flex items-center justify-center border border-stone-200"
                  title="Navigate to customer"
                  aria-label="Navigate to customer"
                >
                  <FaRoute size={16} />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-stone-900 truncate">
            Subtotal: ₹{shopOrder.subtotal}
          </p>
        </div>

        <StatusTimeline status={shopOrder.status} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {canAccept && (
          <button
            onClick={() => onAction("accept", order._id, shopId)}
            className="w-full bg-stone-900 hover:bg-orange-500 text-white text-sm font-semibold py-3 rounded-xl transition-all cursor-pointer"
          >
            Accept Order
          </button>
        )}


        {type === "my" && shopOrder.status === "preparing" && (
          <button
            onClick={() => onAction("start", order._id, shopId)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-3 rounded-xl transition-all cursor-pointer"
          >
            Pick Up & Start Delivery
          </button>
        )}

        {type === "my" && shopOrder.status === "out of delivery" && (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Enter customer OTP"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400"
            />
            <button
              onClick={() => onAction("complete", order._id, shopId, otp)}
              disabled={otp.length !== 4}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-all cursor-pointer"
            >
              Complete Delivery
            </button>
            <button
              onClick={() => onAction("resend", order._id, shopId)}
              className="w-full text-orange-500 hover:text-orange-600 text-xs font-semibold underline py-1 cursor-pointer"
            >
              Resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryBoy() {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState("available");
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(ORDER_ROUTES.GET_ORDERS);
      setAvailableOrders(res.data.available || []);
      setMyOrders(res.data.myOrders || []);
    } catch (error) {
      if (error?.response?.status !== 404) {
        toast.error(error?.response?.data?.message || "Failed to fetch orders");
      } else {
        setAvailableOrders([]);
        setMyOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (userData?.role !== "deliveryBoy") return;

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await axiosInstance.patch(USER_ROUTES.UPDATE_LOCATION, {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          } catch {
            // silent — location update is best-effort
          }
        },
        () => { },
        { enableHighAccuracy: true },
      );
    };

    updateLocation();
    const locationInterval = setInterval(updateLocation, 30000);
    return () => clearInterval(locationInterval);
  }, [userData?.role]);

  const handleToggleOnline = async () => {
    try {
      const res = await axiosInstance.patch(USER_ROUTES.TOGGLE_ONLINE);
      dispatch(setUserData(res.data.user));
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    }
  };

  const handleAction = async (action, orderId, shopId, otp) => {
    try {
      let res;
      if (action === "accept") {
        res = await axiosInstance.post(ORDER_ROUTES.ACCEPT_ORDER(orderId, shopId));
      } else if (action === "start") {
        res = await axiosInstance.patch(
          ORDER_ROUTES.START_DELIVERY(orderId, shopId),
        );
      } else if (action === "complete") {
        if (!otp || otp.length !== 4) {
          toast.error("Please enter a valid 4-digit OTP");
          return;
        }
        res = await axiosInstance.patch(
          ORDER_ROUTES.COMPLETE_DELIVERY(orderId, shopId),
          { otp },
        );
      }
      else if (action === "resend") {
        res = await axiosInstance.post(ORDER_ROUTES.RESEND_OTP(orderId, shopId));
        if (res.data?.otpForTesting) {
          toast.message(`New OTP: ${res.data.otpForTesting}`);
        }
      }
      toast.success(res.data.message);
      fetchOrders();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Action failed");
    }
  };

  const activeOrders = activeTab === "available" ? availableOrders : myOrders;

  return (
    <div className="w-full min-h-screen bg-stone-50 flex flex-col items-center pb-16">
      <Navbar />

      <div className="w-full max-w-3xl flex flex-col gap-6 px-4 sm:px-6 pt-8">
        {/* Delivery tips / help */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <MdOutlineHowToReg className="text-xl" />
            </div>
            {/* <div className="flex-1">
              <p className="text-sm font-bold text-stone-900">How delivery works</p>
              <ul className="text-xs text-stone-600 mt-1 list-disc pl-4 space-y-1">
                <li>Accept → Pick Up & Start</li>
                <li>Complete delivery using customer OTP</li>
                <li>Use Call + Navigate buttons for faster delivery</li>
              </ul>
            </div> */}

            <div className="shrink-0">
              <SmsSupportButton
                phoneNumber={
                  import.meta.env.VITE_SUPPORT_PHONE_NUMBER || userData?.mobile || ""
                }
                message="Need help with my delivery. Please call me back."
              />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src={deliveryBoyLogo}
                alt="Delivery Boy"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                Delivery Partner
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Hello, {userData.fullName}
              </h1>
            </div>
          </div>

          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${userData.isOnline
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-stone-200 text-stone-600 hover:bg-stone-300"
              }`}
          >
            <FaPowerOff size={12} />
            {userData.isOnline ? "Online" : "Offline"}
          </button>
        </div>

        {!userData.isOnline && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            Go online to see and accept delivery orders.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">
              Available
            </p>
            <p className="text-2xl font-bold text-stone-900">
              {availableOrders.reduce((sum, o) => sum + o.shopOrders.length, 0)}
            </p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-1">
              My Deliveries
            </p>
            <p className="text-2xl font-bold text-stone-900">
              {myOrders.reduce((sum, o) => sum + o.shopOrders.length, 0)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white border border-stone-200 rounded-xl p-1">
          {[
            ["available", "Available Orders"],
            ["my", "My Deliveries"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${activeTab === key
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:text-stone-800"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="flex flex-col items-center py-16 text-stone-400">
            <FaBoxOpen className="w-8 h-8 mb-3 animate-pulse" />
            <p className="text-sm">Loading orders...</p>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="w-full bg-white border border-stone-200 rounded-2xl p-10 flex flex-col items-center text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-5">
              <FaBoxOpen className="text-orange-500 w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              No orders yet
            </h2>
            <p className="text-sm text-stone-400 max-w-xs">
              {activeTab === "available"
                ? "New orders will appear here when restaurants mark them as preparing."
                : "Accept an order to see it in your deliveries."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeOrders.map((order) =>
              order.shopOrders.map((shopOrder) => (
                <OrderCard
                  key={`${order._id}-${shopOrder._id}`}
                  order={order}
                  shopOrder={shopOrder}
                  type={activeTab}
                  onAction={handleAction}
                />
              )),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeliveryBoy;
