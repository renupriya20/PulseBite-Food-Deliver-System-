
// import { useEffect, useMemo, useRef, useState } from "react";
// import { io } from "socket.io-client";
// import axiosInstance from "../lib/axios";
// import { ORDER_ROUTES, BACKEND_URL } from "../constants/endpoints";
// import { toast } from "sonner";
// import { FaTimes } from "react-icons/fa";
// import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
// import "leaflet/dist/leaflet.css";

// const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// // Haversine distance (km)
// function haversineKm(lat1, lon1, lat2, lon2) {
//   const toRad = (d) => (d * Math.PI) / 180;
//   const R = 6371;
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

// function formatMinutes(m) {
//   if (!Number.isFinite(m) || m < 0) return "--";
//   if (m < 1) return "< 1 min";
//   if (m >= 60) return `${Math.round(m)} min`;
//   return `~${Math.round(m)} min`;
// }

// function getActiveDelivery(shopOrders) {
//   if (!Array.isArray(shopOrders)) return null;

//   // "delivered" orders keep assignedDeliveryBoy set even after completion,
//   // so we must explicitly exclude finished/cancelled ones — otherwise old
//   // completed deliveries wrongly get picked up as "active".
//   const ACTIVE_STATUSES = ["preparing", "out of delivery"];

//   // Prefer "out of delivery" first (driver has picked up, en route)
//   const out = shopOrders.find((s) => s.status === "out of delivery");
//   if (out) return out;

//   // Fallback: assigned but still at pickup stage — must still be an active status
//   return (
//     shopOrders.find(
//       (s) => !!s.assignedDeliveryBoy && ACTIVE_STATUSES.includes(s.status),
//     ) || null
//   );
// }

// // Recenters the mini-map whenever the driver's live position updates
// function RecenterOnDriver({ position }) {
//   const map = useMap();
//   useEffect(() => {
//     if (position) map.setView(position, map.getZoom(), { animate: true });
//   }, [position, map]);
//   return null;
// }

// export default function LiveDeliveryPopup({ pollMs = 12000 }) {
//   const [active, setActive] = useState(null);
//   const [errorShown, setErrorShown] = useState(false);
//   const [dismissed, setDismissed] = useState(false);

//   // Live position — updated instantly via socket, falls back to polled DB value
//   const [livePosition, setLivePosition] = useState(null); // {lat, lng}
//   const [socketConnected, setSocketConnected] = useState(false);

//   const socketRef = useRef(null);
//   const joinedOrderIdRef = useRef(null);

//   const fetchOrders = async () => {
//     try {
//       const res = await axiosInstance.get(ORDER_ROUTES.GET_ORDERS);
//       const orders = res?.data?.orders || [];
//       if (!orders.length) {
//         setActive(null);
//         return;
//       }

//       // FIX: pehle sirf orders[0] (sabse latest) check hota tha — lekin agar
//       // "out of delivery" wala order latest na ho to wo kabhi milta hi nahi tha.
//       // Ab poori list mein dhundte hain jab tak koi active delivery na mil jaaye.
//       let found = null;
//       let matchedOrderId = null;

//       for (const order of orders) {
//         const shopOrders = order?.shopOrders || [];
//         const candidate = getActiveDelivery(shopOrders);
//         if (candidate) {
//           found = candidate;
//           matchedOrderId = order._id;
//           break;
//         }
//       }

//       setActive(found ? { ...found, _orderId: matchedOrderId } : null);
//       setErrorShown(false);
//     } catch (err) {
//       if (!errorShown) {
//         toast.error(err?.response?.data?.message || "Failed to track delivery");
//         setErrorShown(true);
//       }
//     }
//   };

//   // Base polling — acts as a fallback/sync in case socket misses an update
//   useEffect(() => {
//     fetchOrders();
//     const interval = setInterval(fetchOrders, pollMs);
//     return () => clearInterval(interval);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [pollMs]);

//   useEffect(() => {
//     setDismissed(false);
//   }, [active?._id, active?.status]);

//   // --- REAL-TIME SOCKET TRACKING ---
//   // Connect once, join the order's room, and listen for live driver coordinates.
//   useEffect(() => {
//     const orderId = active?._orderId;
//     if (!orderId || active?.status !== "out of delivery") return;

//     if (!socketRef.current) {
//       const socket = io(BACKEND_URL, {
//         withCredentials: true,
//         transports: ["websocket"],
//       });
//       socketRef.current = socket;

//       socket.on("connect", () => {
//         setSocketConnected(true);
//         console.log("[LiveTracking] Socket connected:", socket.id);
//       });
//       socket.on("disconnect", () => {
//         setSocketConnected(false);
//         console.log("[LiveTracking] Socket disconnected");
//       });

//       socket.on("update_driver_location", (raw) => {
//         console.log("[LiveTracking] Received update_driver_location:", raw);
//         try {
//           const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
//           const { latitude, longitude } = payload?.coordinates || {};
//           if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
//             setLivePosition({ lat: latitude, lng: longitude });
//           }
//         } catch (e) {
//           console.error("Bad live location payload:", e);
//         }
//       });
//     }

//     // Join this order's room (only once per order)
//     if (joinedOrderIdRef.current !== orderId) {
//       console.log("[LiveTracking] Joining room for orderId:", orderId);
//       socketRef.current.emit("join_order_room", { orderId });
//       joinedOrderIdRef.current = orderId;
//     }

//     return () => {
//       // Keep the socket alive across re-renders; only teardown on unmount
//     };
//   }, [active?._orderId, active?.status]);

//   // Full cleanup on unmount
//   useEffect(() => {
//     return () => {
//       socketRef.current?.disconnect();
//       socketRef.current = null;
//     };
//   }, []);

//   // Prefer live socket position; fall back to whatever the last DB poll had
//   const driverLat = livePosition?.lat ?? active?.assignedDeliveryBoy?.location?.coordinates?.[1];
//   const driverLng = livePosition?.lng ?? active?.assignedDeliveryBoy?.location?.coordinates?.[0];
//   const hasDriverPosition = Number.isFinite(driverLat) && Number.isFinite(driverLng);

//   const rawEtaMinutes = useMemo(() => {
//     if (!active || !hasDriverPosition) return null;
//     const custLat = active?.deliveryAddress?.latitude;
//     const custLng = active?.deliveryAddress?.longitude;
//     if (!Number.isFinite(custLat) || !Number.isFinite(custLng)) return null;

//     const km = haversineKm(driverLat, driverLng, custLat, custLng);
//     const kmPerHour = 18; // simple ETA model
//     const minutes = (km / kmPerHour) * 60;
//     return clamp(minutes, 1, 120);
//   }, [active, hasDriverPosition, driverLat, driverLng]);

//   const [smoothedEta, setSmoothedEta] = useState(null);
//   useEffect(() => {
//     if (rawEtaMinutes == null) return;
//     setSmoothedEta((prev) => (prev == null ? rawEtaMinutes : prev * 0.6 + rawEtaMinutes * 0.4));
//   }, [rawEtaMinutes]);

//   const etaConfidence = useMemo(() => {
//     if (!active) return null;
//     if (!active?.assignedDeliveryBoy) return "low";
//     if (!hasDriverPosition) return "low";
//     if (livePosition) return "high"; // live socket data = most confident
//     if (active?.status === "out of delivery") return "medium";
//     return "low";
//   }, [active, hasDriverPosition, livePosition]);

//   const etaLabel = useMemo(() => {
//     const eta = smoothedEta ?? rawEtaMinutes;
//     if (eta == null) return null;
//     if (etaConfidence === "high") return `Arriving in ${formatMinutes(eta)}`;
//     if (etaConfidence === "medium") return `~${Math.round(eta)} min (updating…)`;
//     return `ETA ${formatMinutes(eta)} (approx)`;
//   }, [smoothedEta, rawEtaMinutes, etaConfidence]);

//   if (dismissed || !active) return null;

//   const isDelivered = active?.status === "delivered";
//   const isOnTheWay = active?.status === "out of delivery";
//   const custLat = active?.deliveryAddress?.latitude;
//   const custLng = active?.deliveryAddress?.longitude;
//   const showMap = isOnTheWay && hasDriverPosition && Number.isFinite(custLat) && Number.isFinite(custLng);

//   return (
//     <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] sm:w-full sm:max-w-md">
//       <div className="bg-white border border-stone-200 rounded-2xl shadow-lg overflow-hidden">
//         {/* Live mini-map */}
//         {showMap && (
//           <div className="w-full h-36 relative">
//             <MapContainer
//               style={{ width: "100%", height: "100%" }}
//               center={[driverLat, driverLng]}
//               zoom={15}
//               zoomControl={false}
//               dragging={false}
//               scrollWheelZoom={false}
//               doubleClickZoom={false}
//               attributionControl={false}
//             >
//               <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
//               <RecenterOnDriver position={[driverLat, driverLng]} />
//               <Marker position={[driverLat, driverLng]} />
//               <Marker position={[custLat, custLng]} />
//             </MapContainer>
//             <span
//               className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${socketConnected ? "bg-emerald-500 text-white" : "bg-stone-400 text-white"
//                 }`}
//             >
//               {socketConnected ? "● Live" : "Connecting…"}
//             </span>
//           </div>
//         )}

//         <div className="px-4 py-3">
//           <div className="flex items-center justify-between gap-3">
//             <div className="min-w-0">
//               <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">
//                 Live delivery
//               </p>

//               <p className="text-sm font-bold text-stone-900 truncate">
//                 {isDelivered
//                   ? "Order delivered"
//                   : active?.assignedDeliveryBoy?.fullName || "Finding driver..."}
//               </p>

//               <p className="text-xs text-stone-500 mt-0.5">
//                 {isDelivered
//                   ? "Thanks for ordering!"
//                   : etaLabel || (isOnTheWay ? "Updating location..." : "Waiting for driver assignment...")}
//               </p>
//             </div>

//             <button
//               type="button"
//               onClick={() => setDismissed(true)}
//               className="shrink-0 w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-500 hover:text-stone-700"
//               aria-label="Close live tracking"
//               title="Close"
//             >
//               <FaTimes size={14} />
//             </button>
//           </div>

//           <div className="mt-2 flex items-center justify-between gap-3">
//             <div className="text-[11px] text-stone-500 truncate">
//               {active.deliveryAddress?.text ? `To: ${active.deliveryAddress.text}` : ""}
//             </div>

//             <div className="flex flex-col items-end shrink-0">
//               <div className="text-[11px] text-stone-400">
//                 {isDelivered ? "Delivered" : isOnTheWay ? "On the way" : active.status}
//               </div>

//               {!isDelivered && (
//                 <div className="mt-0.5 w-24 h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
//                   <div
//                     className={
//                       "h-full transition-all duration-300 " +
//                       (etaConfidence === "high"
//                         ? "bg-emerald-500"
//                         : etaConfidence === "medium"
//                           ? "bg-amber-500"
//                           : "bg-rose-500")
//                     }
//                     style={{
//                       width: etaConfidence === "high" ? "100%" : etaConfidence === "medium" ? "60%" : "35%",
//                     }}
//                   />
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import axiosInstance from "../lib/axios";
import { ORDER_ROUTES, BACKEND_URL } from "../constants/endpoints";
import { toast } from "sonner";
import { FaTimes, FaPhoneAlt } from "react-icons/fa";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import scooterImg from "../assets/scooter.png";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatMinutes(m) {
  if (!Number.isFinite(m) || m < 0) return "--";
  if (m < 1) return "< 1 min";
  if (m >= 60) return `${Math.round(m)} min`;
  return `~${Math.round(m)} min`;
}

function getActiveDelivery(shopOrders) {
  if (!Array.isArray(shopOrders)) return null;
  const ACTIVE_STATUSES = ["preparing", "out of delivery"];
  const out = shopOrders.find((s) => s.status === "out of delivery");
  if (out) return out;
  return (
    shopOrders.find(
      (s) => !!s.assignedDeliveryBoy && ACTIVE_STATUSES.includes(s.status)
    ) || null
  );
}

function RecenterOnDriver({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom(), { animate: true });
  }, [position, map]);
  return null;
}

const scooterIcon = new L.DivIcon({
  className: "",
  html:
    '<div style="background: linear-gradient(135deg, #f97316, #ea580c); width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(249,115,22,0.5); border: 3px solid white; font-size: 18px;">🛵</div>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const homeIcon = new L.DivIcon({
  className: "",
  html:
    '<div style="background: #1c1917; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 3px solid white; font-size: 15px;">🏠</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function LiveDeliveryPopup({ pollMs = 12000 }) {
  const [active, setActive] = useState(null);
  const [errorShown, setErrorShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [livePosition, setLivePosition] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const joinedOrderIdRef = useRef(null);

  const fetchOrders = async () => {
    try {
      const res = await axiosInstance.get(ORDER_ROUTES.GET_ORDERS);
      const orders = res?.data?.orders || [];
      if (!orders.length) {
        setActive(null);
        return;
      }

      let found = null;
      let matchedOrderId = null;

      for (const order of orders) {
        const shopOrders = order?.shopOrders || [];
        const candidate = getActiveDelivery(shopOrders);
        if (candidate) {
          found = candidate;
          matchedOrderId = order._id;
          break;
        }
      }

      setActive(found ? { ...found, _orderId: matchedOrderId } : null);
      setErrorShown(false);
    } catch (err) {
      if (!errorShown) {
        toast.error(err?.response?.data?.message || "Failed to track delivery");
        setErrorShown(true);
      }
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, pollMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  useEffect(() => {
    setDismissed(false);
  }, [active?._id, active?.status]);

  useEffect(() => {
    const orderId = active?._orderId;
    if (!orderId || active?.status !== "out of delivery") return;

    if (!socketRef.current) {
      const socket = io(BACKEND_URL, {
        withCredentials: true,
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("connect", () => setSocketConnected(true));
      socket.on("disconnect", () => setSocketConnected(false));

      socket.on("update_driver_location", (raw) => {
        try {
          const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
          const { latitude, longitude } = payload?.coordinates || {};
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            setLivePosition({ lat: latitude, lng: longitude });
          }
        } catch (e) {
          console.error("Bad live location payload:", e);
        }
      });
    }

    if (joinedOrderIdRef.current !== orderId) {
      socketRef.current.emit("join_order_room", { orderId });
      joinedOrderIdRef.current = orderId;
    }
  }, [active?._orderId, active?.status]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const driverLat =
    livePosition?.lat ?? active?.assignedDeliveryBoy?.location?.coordinates?.[1];
  const driverLng =
    livePosition?.lng ?? active?.assignedDeliveryBoy?.location?.coordinates?.[0];
  const hasDriverPosition = Number.isFinite(driverLat) && Number.isFinite(driverLng);

  const rawEtaMinutes = useMemo(() => {
    if (!active || !hasDriverPosition) return null;
    const custLat = active?.deliveryAddress?.latitude;
    const custLng = active?.deliveryAddress?.longitude;
    if (!Number.isFinite(custLat) || !Number.isFinite(custLng)) return null;

    const km = haversineKm(driverLat, driverLng, custLat, custLng);
    const kmPerHour = 18;
    const minutes = (km / kmPerHour) * 60;
    return clamp(minutes, 1, 120);
  }, [active, hasDriverPosition, driverLat, driverLng]);

  const [smoothedEta, setSmoothedEta] = useState(null);
  useEffect(() => {
    if (rawEtaMinutes == null) return;
    setSmoothedEta((prev) =>
      prev == null ? rawEtaMinutes : prev * 0.6 + rawEtaMinutes * 0.4
    );
  }, [rawEtaMinutes]);

  const etaConfidence = useMemo(() => {
    if (!active) return null;
    if (!active?.assignedDeliveryBoy) return "low";
    if (!hasDriverPosition) return "low";
    if (livePosition) return "high";
    if (active?.status === "out of delivery") return "medium";
    return "low";
  }, [active, hasDriverPosition, livePosition]);

  const etaLabel = useMemo(() => {
    const eta = smoothedEta ?? rawEtaMinutes;
    if (eta == null) return null;
    if (etaConfidence === "high") return `Arriving in ${formatMinutes(eta)}`;
    if (etaConfidence === "medium") return `~${Math.round(eta)} min (updating…)`;
    return `ETA ${formatMinutes(eta)} (approx)`;
  }, [smoothedEta, rawEtaMinutes, etaConfidence]);

  if (dismissed || !active) return null;

  const isDelivered = active?.status === "delivered";
  const isOnTheWay = active?.status === "out of delivery";
  const custLat = active?.deliveryAddress?.latitude;
  const custLng = active?.deliveryAddress?.longitude;
  const showMap =
    isOnTheWay &&
    hasDriverPosition &&
    Number.isFinite(custLat) &&
    Number.isFinite(custLng);

  const driverName = active?.assignedDeliveryBoy?.fullName;
  const driverMobile = active?.assignedDeliveryBoy?.mobile;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] sm:w-full sm:max-w-md">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-lg overflow-hidden">
        {showMap && (
          <div className="w-full h-36 relative">
            <MapContainer
              style={{ width: "100%", height: "100%" }}
              center={[driverLat, driverLng]}
              zoom={15}
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <RecenterOnDriver position={[driverLat, driverLng]} />
              <Marker position={[driverLat, driverLng]} icon={scooterIcon} />
              <Marker position={[custLat, custLng]} icon={homeIcon} />
            </MapContainer>
            <span
              className={
                "absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full " +
                (socketConnected ? "bg-emerald-500 text-white" : "bg-stone-400 text-white")
              }
            >
              {socketConnected ? "● Live" : "Connecting…"}
            </span>
          </div>
        )}

        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              {!isDelivered && driverName && (
                <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-orange-400">
                  <img src={scooterImg} alt="Delivery partner" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">
                  Live delivery
                </p>

                <p className="text-sm font-bold text-stone-900 truncate">
                  {isDelivered ? "Order delivered" : driverName || "Finding driver..."}
                </p>

                <p className="text-xs text-stone-500 mt-0.5">
                  {isDelivered
                    ? "Thanks for ordering!"
                    : etaLabel ||
                    (isOnTheWay ? "Updating location..." : "Waiting for driver assignment...")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isDelivered && driverMobile && (
                <a
                  href={"tel:" + driverMobile}
                  className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors"
                  aria-label="Call delivery partner"
                  title={"Call " + (driverName || "driver")}
                >
                  <FaPhoneAlt size={13} />
                </a>
              )}
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-500 hover:text-stone-700"
                aria-label="Close live tracking"
                title="Close"
              >
                <FaTimes size={14} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="text-[11px] text-stone-500 truncate">
              {active.deliveryAddress?.text ? "To: " + active.deliveryAddress.text : ""}
            </div>

            <div className="flex flex-col items-end shrink-0">
              <div className="text-[11px] text-stone-400">
                {isDelivered ? "Delivered" : isOnTheWay ? "On the way" : active.status}
              </div>

              {!isDelivered && (
                <div className="mt-0.5 w-24 h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                  <div
                    className={
                      "h-full transition-all duration-300 " +
                      (etaConfidence === "high"
                        ? "bg-emerald-500"
                        : etaConfidence === "medium"
                          ? "bg-amber-500"
                          : "bg-rose-500")
                    }
                    style={{
                      width:
                        etaConfidence === "high"
                          ? "100%"
                          : etaConfidence === "medium"
                            ? "60%"
                            : "35%",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}