import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
    FaCheckCircle,
    FaExclamationTriangle,
    FaPhone,
    FaPowerOff,
    FaShieldAlt,
    FaBell,
    FaRoute
} from "react-icons/fa";
import { FaLocationDot, FaBoxOpen } from "react-icons/fa6";
import { toast } from "sonner";
import axiosInstance from "../lib/axios";
import { useSelector, useDispatch } from "react-redux";
import Navbar from "../components/Navbar";
import { BACKEND_URL } from "../constants/endpoints";

const SOCKET_EVENTS = {
    joinCustomerRoom: "delivery:telemetry:join",
    joinAdminRoom: "delivery:sos:join-admin",
    telemetryWatch: "delivery:telemetry:watch",
};

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
        <div className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 mt-2">
            <div className="flex items-center justify-between gap-2">
                {steps.map((s, i) => {
                    const done = i <= idx && idx !== -1;
                    return (
                        <div key={s.key} className="flex flex-col items-center flex-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${done ? s.dot : "bg-stone-300"}`} />
                            <p className={`text-[10px] font-semibold mt-1 text-center ${done ? "text-stone-900" : "text-stone-400"}`}>
                                {s.label}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function OrderCard({ order, shopOrder, type, onAction, countdownMs }) {
    const [otp, setOtp] = useState("");
    if (!order || !shopOrder) return null;
    const shop = shopOrder.shop;
    const shopId = shop?._id || shopOrder.shop;
    const addressText = order?.deliveryAddress?.text || "";
    const formatCountdown = (ms) => {
        const s = Math.max(0, Math.ceil(ms / 1000));
        const mm = Math.floor(s / 60);
        const ss = s % 60;
        return mm > 0 ? `${mm}m ${ss}s` : `${ss}s`;
    };
    return (
        <div className="w-full bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-1">
                        {shop?.name || "Merchant Restaurant"}
                    </p>
                    <h3 className="text-sm font-bold text-stone-900">
                        Order #{order._id?.slice(-6).toUpperCase()}
                    </h3>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_COLORS[shopOrder.status] || "bg-stone-100 text-stone-600"}`}>
                    {shopOrder.status}
                </span>
            </div>
            <div className="space-y-2 mb-4 border-b border-stone-100 pb-3">
                <div className="flex items-start gap-2 text-sm text-stone-600">
                    <FaLocationDot className="text-orange-500 mt-0.5 shrink-0" />
                    <span>{addressText || "No Address Provided"}</span>
                </div>
            </div>
            {type === "available" && (
                <button
                    onClick={() => onAction("accept", order._id, shopId)}
                    className="w-full bg-stone-900 hover:bg-orange-500 text-white text-sm font-semibold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                    Accept Ride {countdownMs > 0 && `• ${formatCountdown(countdownMs)}`}
                </button>
            )}
            {type === "my" && shopOrder.status === "out of delivery" && (
                <div className="flex flex-col gap-2 mt-2">
                    <input
                        type="text"
                        placeholder="Enter 4-digit Customer OTP"
                        maxLength={4}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400"
                    />
                    <button
                        onClick={() => onAction("complete", order._id, shopId, otp)}
                        disabled={otp.length !== 4}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-all"
                    >
                        Complete Delivery
                    </button>
                </div>
            )}
            <StatusTimeline status={shopOrder.status} />
        </div>
    );
}

export default function DeliveryBoyHub() {
    const { userData } = useSelector((s) => s.user);
    const [isLoading, setIsLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);

    // Order that IS already assigned to me (accepted, possibly out for delivery)
    const [activeOrder, setActiveOrder] = useState(null);

    // Orders that are NOT assigned to anyone yet — these are what "Accept Ride" should show
    const [availableOrders, setAvailableOrders] = useState([]);

    const [countdownMs, setCountdownMs] = useState(3000);

    const geoWatchIdRef = useRef(null);
    const socketRef = useRef(null);

    // Socket connection (for telemetry/SOS)
    useEffect(() => {
        if (!userData) return;

        // Prevent duplicate connections in React strict-mode/dev
        if (socketRef.current) return;

        const socket = io(BACKEND_URL, {
            withCredentials: true,
            transports: ["websocket"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit(SOCKET_EVENTS.joinAdminRoom, {});
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connect_error:", err?.message || err);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [userData]);

    const fetchDashboard = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`${BACKEND_URL}/api/v1/delivery/eco-dashboard`);
            setDashboard(res?.data?.dashboard || null);
        } catch (e) {
            console.error(e);
        }
    }, []);

    // Fetches the order that's ALREADY mine (assigned to me)
    const fetchActiveOrder = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`${BACKEND_URL}/api/v1/delivery/active-request`);

            if (res.data?.success) {
                if (res.data.order && res.data.shopOrder) {
                    setActiveOrder({
                        order: res.data.order,
                        shopOrder: res.data.shopOrder,
                    });
                } else {
                    setActiveOrder(null);
                }
            }
        } catch (e) {
            console.error("Failed to fetch active order:", e);
            setActiveOrder(null);
        }
    }, []);

    // Fetches orders that are NOT assigned to anyone yet (genuinely available to accept)
    const fetchAvailableOrders = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`${BACKEND_URL}/api/v1/delivery/available-orders`);
            if (res.data?.success) {
                setAvailableOrders(res.data.orders || []);
            }
        } catch (e) {
            console.error("Failed to fetch available orders:", e);
            setAvailableOrders([]);
        }
    }, []);

    const startGeoWatch = useCallback(() => {
        if (!navigator.geolocation) return;
        geoWatchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (socketRef.current?.connected) {
                    socketRef.current.emit(SOCKET_EVENTS.telemetryWatch, {
                        coordinates: [longitude, latitude],
                    });
                }
            },
            (err) => console.error(err),
            {
                enableHighAccuracy: false,
                timeout: 30000,
            },
        );
    }, []);

    const handleOrderAction = async (actionType, orderId, shopId, otp = "") => {
        try {
            if (actionType === "accept") {
                const res = await axiosInstance.post(`${BACKEND_URL}/api/v1/delivery/accept/${orderId}/${shopId}`);

                if (res.data.success) {
                    toast.success("Order accepted successfully!");

                    // TESTING helper: backend acceptOrderV2 me otpForTesting bhejta hai (if present)
                    const otpForTesting = res?.data?.otpForTesting;
                    if (otpForTesting) {
                        toast.message(`Testing OTP: ${otpForTesting}`);
                    }

                    await fetchActiveOrder();
                    await fetchAvailableOrders();
                    fetchDashboard();
                }
            } else if (actionType === "complete") {
                const res = await axiosInstance.post(`${BACKEND_URL}/api/v1/delivery/verify-complete/${orderId}`, {
                    otp: otp,
                    shopId: shopId,
                });

                if (res?.data?.otpForTesting) {
                    toast.message(`New Testing OTP: ${res.data.otpForTesting}`);
                }

                if (res.data.success) {
                    toast.success("Delivery completed successfully!");
                    setActiveOrder(null);
                    fetchDashboard();
                    fetchAvailableOrders();
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    const handleSOSEmergency = async () => {
        try {
            const res = await axiosInstance.post(`${BACKEND_URL}/api/v1/delivery/sos-alert`);
            if (res.data.success) {
                toast.error("SOS Alert broadcasted to Admin panel!");
            }
        } catch (e) {
            toast.error("Failed to trigger SOS");
        }
    };

    useEffect(() => {
        setIsLoading(false);
        fetchActiveOrder();
        fetchAvailableOrders();
        startGeoWatch();
        return () => {
            if (geoWatchIdRef.current) navigator.geolocation.clearWatch(geoWatchIdRef.current);
        };
    }, [fetchActiveOrder, fetchAvailableOrders, startGeoWatch]);

    useEffect(() => {
        if (!userData) return;
        fetchDashboard();
    }, [userData, fetchDashboard]);

    useEffect(() => {
        if (countdownMs <= 0) return;
        const timer = setInterval(() => {
            setCountdownMs((prev) => prev - 1000);
        }, 1000);
        return () => clearInterval(timer);
    }, [countdownMs]);

    return (
        <div className="min-h-screen bg-stone-50 pb-10">
            <Navbar />
            <div className="max-w-md mx-auto px-4 mt-6 space-y-4">
                <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs text-stone-500">Vehicle Type</p>
                        <h4 className="text-sm font-bold text-stone-900">{userData?.vehicleType || "EV Scooter"}</h4>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-stone-500 mb-1">Status</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
                            Online
                        </span>
                    </div>
                </div>

                <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div>
                        <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1">
                            <FaShieldAlt className="text-red-600" /> SOS Emergency
                        </h4>
                        <p className="text-xs text-stone-500">Broadcast instant coordinates to admin panel</p>
                    </div>
                    <button
                        onClick={handleSOSEmergency}
                        className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-3 rounded-xl transition-all"
                    >
                        🚨 SOS Emergency
                    </button>
                </div>

                {/* MY ACTIVE ORDER (already accepted by me) */}
                {activeOrder && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">My Active Delivery</p>
                        <OrderCard
                            order={activeOrder.order}
                            shopOrder={activeOrder.shopOrder}
                            type="my"
                            onAction={handleOrderAction}
                            countdownMs={countdownMs}
                        />
                    </div>
                )}

                {/* AVAILABLE ORDERS (unassigned, waiting for someone to accept) */}
                {!activeOrder && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Available Orders</p>
                        {availableOrders.length > 0 ? (
                            availableOrders.map(({ order, shopOrder }) => (
                                <OrderCard
                                    key={`${order._id}-${shopOrder.shop?._id || shopOrder.shop}`}
                                    order={order}
                                    shopOrder={shopOrder}
                                    type="available"
                                    onAction={handleOrderAction}
                                    countdownMs={countdownMs}
                                />
                            ))
                        ) : (
                            <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center text-stone-400 text-sm">
                                No available orders right now.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}