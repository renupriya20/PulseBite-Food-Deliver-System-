import { useCallback, useEffect, useState } from "react";
import { FaLocationDot, FaMotorcycle } from "react-icons/fa6";
import { TbReceipt2 } from "react-icons/tb";
import { toast } from "sonner";
import { ORDER_ROUTES } from "../constants/endpoints";
import axiosInstance from "../lib/axios";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  preparing: "bg-blue-100 text-blue-700",
  "out of delivery": "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
};

function OwnerOrderCard({ order, shopOrder, shopId, onUpdate }) {
  const [riders, setRiders] = useState([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchRiders = useCallback(async () => {
    if (shopOrder.status !== "preparing" || shopOrder.assignedDeliveryBoy) return;
    try {
      setLoadingRiders(true);
      const res = await axiosInstance.get(ORDER_ROUTES.ONLINE_DELIVERY_BOYS);
      setRiders(res.data.deliveryBoys || []);
    } catch {
      setRiders([]);
    } finally {
      setLoadingRiders(false);
    }
  }, [shopOrder.status, shopOrder.assignedDeliveryBoy]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  const handleStatusUpdate = async (status) => {
    try {
      setUpdating(true);
      const res = await axiosInstance.patch(
        ORDER_ROUTES.UPDATE_STATUS(order._id, shopId),
        { status },
      );
      toast.success(res.data.message);
      onUpdate();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async (deliveryBoyId) => {
    try {
      setUpdating(true);
      const res = await axiosInstance.post(
        ORDER_ROUTES.ASSIGN_DELIVERY_BOY(order._id, shopId, deliveryBoyId),
      );
      toast.success(res.data.message);
      onUpdate();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to assign rider");
    } finally {
      setUpdating(false);
    }
  };

  const rider = shopOrder.assignedDeliveryBoy;

  return (
    <div className="w-full bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-1">
            Order #{order._id.slice(-6).toUpperCase()}
          </p>
          <p className="text-xs text-stone-400">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[shopOrder.status] || "bg-stone-100 text-stone-600"}`}
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

      <div className="border-t border-stone-100 pt-4 space-y-2 mb-4">
        {order.user && (
          <p className="text-sm text-stone-600">
            <span className="font-semibold text-stone-800">Customer:</span>{" "}
            {order.user.fullName} · {order.user.mobile}
          </p>
        )}
        <div className="flex items-start gap-2 text-sm text-stone-600">
          <FaLocationDot className="text-orange-500 mt-0.5 shrink-0" />
          <span>{order.deliveryAddress?.text}</span>
        </div>
        <p className="text-sm font-bold text-stone-900">
          Subtotal: ₹{shopOrder.subtotal} · {order.paymentMethod?.toUpperCase()}
        </p>
      </div>

      {rider && (
        <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-4 py-3 mb-4 text-sm text-stone-700">
          <FaMotorcycle className="text-orange-500 shrink-0" />
          <span>
            Rider: <strong>{rider.fullName}</strong> · {rider.mobile}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {shopOrder.status === "pending" && (
          <button
            onClick={() => handleStatusUpdate("preparing")}
            disabled={updating}
            className="w-full bg-stone-900 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-all cursor-pointer"
          >
            {updating ? "Updating..." : "Start Preparing"}
          </button>
        )}

        {shopOrder.status === "preparing" && !rider && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">
              Assign delivery partner
            </p>
            {loadingRiders ? (
              <p className="text-sm text-stone-400">Loading riders...</p>
            ) : riders.length === 0 ? (
              <p className="text-sm text-stone-400">
                No riders online. A rider can also accept from their app.
              </p>
            ) : (
              <select
                defaultValue=""
                disabled={updating}
                onChange={(e) => {
                  if (e.target.value) handleAssign(e.target.value);
                }}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 cursor-pointer"
              >
                <option value="" disabled>
                  Select a rider
                </option>
                {riders.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.fullName} · {r.mobile}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
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
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const pendingCount = orders.reduce(
    (sum, o) =>
      sum + o.shopOrders.filter((s) => s.status === "pending").length,
    0,
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 text-stone-400">
        <TbReceipt2 className="w-8 h-8 mb-3 animate-pulse" />
        <p className="text-sm">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="w-full bg-white border border-stone-200 rounded-2xl p-10 flex flex-col items-center text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-5">
          <TbReceipt2 className="text-orange-500 w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-stone-900 mb-2">No orders yet</h2>
        <p className="text-sm text-stone-400 max-w-xs">
          New customer orders will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-stone-800">
          Incoming Orders
          {pendingCount > 0 && (
            <span className="ml-2 text-[10px] font-semibold text-white bg-orange-500 px-2 py-0.5 rounded-full">
              {pendingCount} new
            </span>
          )}
        </h2>
        <button
          onClick={fetchOrders}
          className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 uppercase tracking-widest transition-colors cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {orders.map((order) =>
        order.shopOrders.map((shopOrder) => {
          const shopId = shopOrder.shop?._id || shopOrder.shop;
          return (
            <OwnerOrderCard
              key={`${order._id}-${shopOrder._id}`}
              order={order}
              shopOrder={shopOrder}
              shopId={shopId}
              onUpdate={fetchOrders}
            />
          );
        }),
      )}
    </div>
  );
}

export default OwnerOrders;
