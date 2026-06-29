import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ORDER_ROUTES } from "../constants/endpoints";
import axiosInstance from "../lib/axios";
import Navbar from "../components/Navbar";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  "out of delivery": "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
};

function OrderCard({ order }) {
  return (
    <div className="w-full bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-1">
            {order.shopOrders?.[0]?.shop?.name || "Restaurant"}
          </p>
          <h3 className="text-sm font-bold text-stone-900">
            Order #{order._id.slice(-6).toUpperCase()}
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {order.shopOrders?.map((shopOrder) => (
          <div key={shopOrder._id || shopOrder.shop?._id}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm font-bold text-stone-900">
                {shopOrder.shop?.name || "Shop"}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[shopOrder.status] || "bg-stone-100 text-stone-600"
                  }`}
              >
                {shopOrder.status}
              </span>
            </div>

            <div className="space-y-2">
              {shopOrder.shopOrderItems?.map((it, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-stone-600">
                    {it.item?.name || it.name} × {it.quantity}
                  </span>
                  <span className="font-medium text-stone-800">
                    ₹{it.item?.price ? it.item.price * it.quantity : it.price * it.quantity}
                  </span>
                </div>
              ))}
            </div>

            {shopOrder.subtotal != null && (
              <p className="text-sm font-bold text-stone-900 mt-3">
                Subtotal: ₹{shopOrder.subtotal}
              </p>
            )}

            {shopOrder.deliveryAddress?.text && (
              <p className="text-sm text-stone-600 mt-1">
                Delivery: {shopOrder.deliveryAddress.text}
              </p>
            )}

            {!!shopOrder.assignedDeliveryBoy?.location?.coordinates?.length && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Live Delivery Partner Location
                </p>
                {(() => {
                  const [lng, lat] = shopOrder.assignedDeliveryBoy.location.coordinates;
                  const mapsHref = `https://www.google.com/maps?q=${lat},${lng}`;
                  return (
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-sm text-stone-700">
                        {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                      </div>
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-orange-600 hover:text-orange-700 underline"
                      >
                        Open in Maps
                      </a>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500">Payment</span>
        <span className="font-semibold text-stone-800">
          {order.paymentMethod?.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function MyOrders() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);


  const fetchOrders = useCallback(async () => {
    try {
      const res = await axiosInstance.get(ORDER_ROUTES.GET_ORDERS);
      setOrders(res.data.orders || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  if (userData?.role !== "user") {
    return (
      <div className="min-h-screen bg-stone-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-stone-600">Not allowed.</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-stone-50 flex flex-col items-center pb-16">
      <Navbar />

      <div className="w-full max-w-3xl flex flex-col gap-6 px-4 sm:px-6 pt-10">
        <div className="flex items-start justify-between gap-4">
          <button
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-600 transition-colors cursor-pointer"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900">My Orders</h1>
            <p className="text-sm text-stone-500 mt-1">Track your recent orders</p>
          </div>
        </div>


        {loading ? (
          <div className="flex flex-col items-center py-16 text-stone-400">
            <div className="w-10 h-10 rounded-full bg-stone-100 animate-pulse" />
            <p className="text-sm mt-3">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="w-full bg-white border border-stone-200 rounded-2xl p-10 flex flex-col items-center text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-5">📦</div>
            <h2 className="text-lg font-bold text-stone-900 mb-2">No orders yet</h2>
            <p className="text-sm text-stone-400 max-w-xs">When you place an order, it will show up here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((o) => (
              <OrderCard key={o._id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyOrders;

