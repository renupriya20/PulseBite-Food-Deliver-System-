import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
    FaStar,
    FaPowerOff,
    FaGear,
    FaCircleQuestion,
} from "react-icons/fa6";
import { FaShieldAlt } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { toast } from "sonner";
import axiosInstance from "../lib/axios";
import { useSelector } from "react-redux";
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
                    <button
                        onClick={() => onAction("resend", order._id, shopId)}
                        className="w-full text-orange-500 hover:text-orange-600 text-xs font-semibold underline py-1 cursor-pointer"
                    >
                        Resend OTP
                    </button>
                </div>
            )}
            <StatusTimeline status={shopOrder.status} />
        </div>
    );
}

// Profile card — matches the wireframe: photo, name, ID, rating, stats grid, settings/help
function ProfileCard({ profile, userData, toggling, onToggleOnline, onOpenSettings, onOpenHelp }) {
    const isOnline = profile?.status === "online" || profile?.status === "on_delivery";
    const riderName = userData?.fullName || "Rider";
    const riderIdShort = userData?._id ? userData._id.slice(-6).toUpperCase() : "------";
    const rating = profile?.safetyRating ? (profile.safetyRating / 20).toFixed(1) : "5.0";
    const totalTrips = profile?.wallet?.totalDeliveries ?? 0;
    const walletBalance = profile?.wallet?.earnings ?? 0;
    const ecoEarnings = profile?.wallet?.ecoBonusEarnings ?? 0;

    return (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-stone-100">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                    Profile
                </p>
                <button
                    onClick={onToggleOnline}
                    disabled={toggling}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${isOnline
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                        }`}
                >
                    <FaPowerOff size={10} />
                    {isOnline ? "Online" : "Offline"}
                </button>
            </div>

            <div className="flex flex-col items-center px-5 py-6 border-b border-stone-100">
                <div className="w-20 h-20 rounded-full bg-orange-100 border-4 border-orange-50 flex items-center justify-center text-2xl font-black text-orange-500 mb-3">
                    {riderName.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-base font-bold text-stone-900">{riderName}</h2>
                <p className="text-xs text-stone-400 mt-0.5">ID: DEL-{riderIdShort}</p>
                <div className="flex items-center gap-1.5 mt-2 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                    <FaStar className="text-amber-400" size={12} />
                    <span className="text-xs font-bold text-stone-800">{rating}</span>
                    <span className="text-[10px] text-stone-400">({totalTrips}+ trips)</span>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 divide-x divide-stone-100 border-b border-stone-100">
                <div className="px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Today's Earnings</p>
                    <p className="text-lg font-black text-emerald-600 mt-1">₹{walletBalance.toFixed(0)}</p>
                </div>
                <div className="px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Orders Done</p>
                    <p className="text-lg font-black text-stone-900 mt-1">{totalTrips}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-stone-100 border-b border-stone-100">
                <div className="px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">My Wallet</p>
                    <p className="text-lg font-black text-orange-500 mt-1">₹{(walletBalance + ecoEarnings).toFixed(0)}</p>
                </div>
                <div className="px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Eco Bonus</p>
                    <p className="text-lg font-black text-emerald-600 mt-1">₹{ecoEarnings.toFixed(0)}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="divide-y divide-stone-100">
                <button
                    onClick={onOpenSettings}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-stone-50 transition-colors cursor-pointer"
                >
                    <span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                        <FaGear className="text-stone-500" size={13} />
                    </span>
                    <span className="text-sm font-semibold text-stone-800">Settings</span>
                </button>
                <button
                    onClick={onOpenHelp}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-stone-50 transition-colors cursor-pointer"
                >
                    <span className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                        <FaCircleQuestion className="text-stone-500" size={13} />
                    </span>
                    <span className="text-sm font-semibold text-stone-800">Help & Support</span>
                </button>
            </div>
        </div>
    );
}

// Simple modal shell — used by both Settings and Help
function Modal({ title, onClose, children }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                    <h3 className="text-sm font-bold text-stone-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-700 text-lg leading-none cursor-pointer"
                    >
                        ✕
                    </button>
                </div>
                <div className="px-5 py-5">{children}</div>
            </div>
        </div>
    );
}

function SettingsModal({ currentVehicleType, onClose, onSaved }) {
    const [vehicleType, setVehicleType] = useState(currentVehicleType || "EV_Scooter");
    const [saving, setSaving] = useState(false);

    const vehicles = [
        { value: "Cycle", label: "🚲 Cycle" },
        { value: "EV_Scooter", label: "🛵 EV Scooter" },
        { value: "Petrol_Bike", label: "🏍️ Petrol Bike" },
    ];

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axiosInstance.put(`${BACKEND_URL}/api/v1/delivery/vehicle-type`, {
                vehicleType,
            });
            if (res.data?.success) {
                toast.success("Vehicle type updated!");
                onSaved(res.data.profile);
                onClose();
            }
        } catch (e) {
            toast.error(e?.response?.data?.message || "Couldn't update vehicle type");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Settings" onClose={onClose}>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
                Vehicle Type
            </p>
            <div className="flex flex-col gap-2 mb-5">
                {vehicles.map((v) => (
                    <button
                        key={v.value}
                        onClick={() => setVehicleType(v.value)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer ${vehicleType === v.value
                            ? "border-orange-400 bg-orange-50 text-orange-600"
                            : "border-stone-200 text-stone-600 hover:border-stone-300"
                            }`}
                    >
                        {v.label}
                        {vehicleType === v.value && <span>✓</span>}
                    </button>
                ))}
            </div>
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-stone-900 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-all cursor-pointer"
            >
                {saving ? "Saving…" : "Save Changes"}
            </button>
        </Modal>
    );
}

function HelpModal({ onClose }) {
    return (
        <Modal title="Help & Support" onClose={onClose}>
            <div className="flex flex-col gap-3">
                <p className="text-sm text-stone-600">
                    Need help with an order, payout, or your account? Reach out and we'll get back to you.
                </p>

                <a
                    href="mailto:support@pulsebite.app"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 hover:border-orange-300 hover:bg-orange-50 transition-all"
                >
                    <span className="text-lg">✉️</span>
                    <div>
                        <p className="text-sm font-semibold text-stone-800">Email Support</p>
                        <p className="text-xs text-stone-400">support@pulsebite.app</p>
                    </div>
                </a>

                <a
                    href="tel:+911234567890"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 hover:border-orange-300 hover:bg-orange-50 transition-all"
                >
                    <span className="text-lg">📞</span>
                    <div>
                        <p className="text-sm font-semibold text-stone-800">Call Support</p>
                        <p className="text-xs text-stone-400">+91 12345 67890</p>
                    </div>
                </a>

                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-stone-50">
                    <span className="text-lg">🕘</span>
                    <div>
                        <p className="text-sm font-semibold text-stone-800">Support Hours</p>
                        <p className="text-xs text-stone-400">Every day, 8 AM – 11 PM</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default function DeliveryBoyHub() {
    const { userData } = useSelector((s) => s.user);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [toggling, setToggling] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Order that IS already assigned to me (accepted, possibly out for delivery)
    const [activeOrder, setActiveOrder] = useState(null);

    // Orders that are NOT assigned to anyone yet — these are what "Accept Ride" should show
    const [availableOrders, setAvailableOrders] = useState([]);

    const [countdownMs, setCountdownMs] = useState(3000);

    const geoWatchIdRef = useRef(null);
    const socketRef = useRef(null);
    const activeOrderIdRef = useRef(null);

    // Keep a ref in sync so the geolocation callback always sees the latest order id
    useEffect(() => {
        activeOrderIdRef.current = activeOrder?.order?._id || null;
    }, [activeOrder]);

    // Socket connection (for telemetry/SOS)
    useEffect(() => {
        if (!userData) return;
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

    // Fetches delivery boy profile (wallet, eco score, status, safetyRating)
    const fetchProfile = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`${BACKEND_URL}/api/v1/delivery/profile`);
            if (res.data?.success) setProfile(res.data.profile);
        } catch (e) {
            console.error("Failed to fetch profile:", e);
        }
    }, []);

    const handleToggleOnline = async () => {
        setToggling(true);
        try {
            const res = await axiosInstance.put(`${BACKEND_URL}/api/v1/delivery/status`);
            if (res.data?.success) {
                setProfile((prev) => ({ ...prev, status: res.data.status }));
                toast.success(res.data.message);
            }
        } catch (e) {
            toast.error(e?.response?.data?.message || "Couldn't update status");
        } finally {
            setToggling(false);
        }
    };

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
                const activeOrderId = activeOrderIdRef.current;

                console.log("[LiveTracking] Geo update:", {
                    latitude,
                    longitude,
                    activeOrderId,
                    socketConnected: socketRef.current?.connected,
                });

                // Sirf tab bhejें jab koi order actually assigned ho — warna backend
                // isko ignore kar dega (activeOrderId required hai).
                if (socketRef.current?.connected && activeOrderId) {
                    socketRef.current.emit("update_driver_location", {
                        driverId: userData?._id,
                        activeOrderId,
                        coordinates: [longitude, latitude], // backend [lng, lat] expect karta hai
                    });
                    console.log("[LiveTracking] Emitted update_driver_location for order:", activeOrderId);
                } else {
                    console.log("[LiveTracking] Skipped emit — socket connected:", socketRef.current?.connected, "| activeOrderId:", activeOrderId);
                }
            },
            (err) => console.error("[LiveTracking] Geolocation error:", err),
            {
                enableHighAccuracy: true,
                timeout: 30000,
            },
        );
    }, [userData?._id]);

    const handleOrderAction = async (actionType, orderId, shopId, otp = "") => {
        try {
            if (actionType === "accept") {
                const res = await axiosInstance.post(`${BACKEND_URL}/api/v1/delivery/accept/${orderId}/${shopId}`);

                if (res.data.success) {
                    toast.success("Order accepted successfully!");

                    const otpForTesting = res?.data?.otpForTesting;
                    if (otpForTesting) {
                        toast.message(`Testing OTP: ${otpForTesting}`);
                    }

                    await fetchActiveOrder();
                    await fetchAvailableOrders();
                    fetchProfile();
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
                    fetchProfile();
                    fetchAvailableOrders();
                }
            } else if (actionType === "resend") {
                const res = await axiosInstance.post(`${BACKEND_URL}/api/v1/order/resend-otp/${orderId}/${shopId}`);
                if (res?.data?.otpForTesting) {
                    toast.message(`New OTP: ${res.data.otpForTesting}`);
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
        fetchProfile();
        fetchActiveOrder();
        fetchAvailableOrders();
        startGeoWatch();
        return () => {
            if (geoWatchIdRef.current) navigator.geolocation.clearWatch(geoWatchIdRef.current);
        };
    }, [fetchProfile, fetchActiveOrder, fetchAvailableOrders, startGeoWatch]);

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
            <div className="max-w-5xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
                {/* LEFT COLUMN — Profile + SOS */}
                <div className="space-y-4">
                    <ProfileCard
                        profile={profile}
                        userData={userData}
                        toggling={toggling}
                        onToggleOnline={handleToggleOnline}
                        onOpenSettings={() => setShowSettings(true)}
                        onOpenHelp={() => setShowHelp(true)}
                    />

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
                </div>

                {/* RIGHT COLUMN — Active / Available orders */}
                <div className="space-y-4">
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

            {showSettings && (
                <SettingsModal
                    currentVehicleType={profile?.vehicleType}
                    onClose={() => setShowSettings(false)}
                    onSaved={(updatedProfile) => setProfile(updatedProfile)}
                />
            )}

            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        </div>
    );
}