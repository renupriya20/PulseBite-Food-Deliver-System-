import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../lib/axios";
import { ORDER_ROUTES } from "../constants/endpoints";
import { toast } from "sonner";
import { FaTimes } from "react-icons/fa";


const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Haversine distance (km)
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
  // out of delivery => delivery started (best for "kitne minute" ETA)
  const out = shopOrders.find((s) => s.status === "out of delivery");
  if (out) return out;
  // fallback: if assigned but still preparing
  return shopOrders.find((s) => !!s.assignedDeliveryBoy) || null;
}

export default function LiveDeliveryPopup({ pollMs = 9000 }) {

  const [active, setActive] = useState(null);
  const [errorShown, setErrorShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(ORDER_ROUTES.GET_ORDERS);
      const orders = res?.data?.orders || [];
      if (!orders.length) {
        setActive(null);
        return;
      }

      // pick latest order that has a delivery boy assigned
      const latest = orders[0];
      const shopOrders = latest?.shopOrders || [];

      // Prefer "out of delivery" if available, else fallback to assigned delivery boy
      const found = getActiveDelivery(shopOrders);
      setActive(found);
      setErrorShown(false);
    } catch (err) {
      if (!errorShown) {
        toast.error(err?.response?.data?.message || "Failed to track delivery");
        setErrorShown(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Adaptive polling: when out-of-delivery, poll faster for better UX.
  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      // If we have an active delivery and it has started, poll faster.
      // else keep base polling to reduce API load.
      // We can't directly use computed state inside setInterval callback safely,
      // so we just call fetchOrders() every base pollMs and rely on a second effect
      // for faster updates when status flips.
      fetchOrders();
    }, pollMs);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  // Faster polling when status is out of delivery.
  useEffect(() => {
    if (!active) return;

    const isOnTheWay = active?.status === "out of delivery";
    if (!isOnTheWay) return;

    const interval = setInterval(() => {
      fetchOrders();
    }, 6500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?._id, active?.status]);

  useEffect(() => {
    // When active delivery changes, re-show popup
    setDismissed(false);
  }, [active?._id, active?.status]);

  const rawEtaMinutes = useMemo(() => {
    if (!active) return null;

    const delCoords = active?.assignedDeliveryBoy?.location?.coordinates;
    const custLat = active?.deliveryAddress?.latitude;
    const custLng = active?.deliveryAddress?.longitude;

    if (!delCoords?.length || !Number.isFinite(custLat) || !Number.isFinite(custLng)) {
      return null;
    }

    // stored as [lng, lat] (as per MyOrders.jsx)
    const [lng, lat] = delCoords;

    const km = haversineKm(lat, lng, custLat, custLng);

    // simple ETA model: assume 18 km/h delivery speed
    const kmPerHour = 18;
    const minutes = (km / kmPerHour) * 60;

    return clamp(minutes, 2, 120);
  }, [active]);

  // Smooth ETA to reduce jitter
  const [smoothedEta, setSmoothedEta] = useState(null);
  useEffect(() => {
    if (rawEtaMinutes == null) return;

    setSmoothedEta((prev) => {
      if (prev == null) return rawEtaMinutes;
      // weighted moving average
      return prev * 0.65 + rawEtaMinutes * 0.35;
    });
  }, [rawEtaMinutes]);

  const etaConfidence = useMemo(() => {
    if (!active) return null;

    const hasDriver = !!active?.assignedDeliveryBoy;
    const hasCoords = !!active?.assignedDeliveryBoy?.location?.coordinates?.length;

    if (!hasDriver) return "low";
    if (!hasCoords) return "low";

    if (active?.status === "out of delivery") return "high";

    // If status is earlier but coords exist, medium confidence.
    return "medium";
  }, [active]);

  const etaLabel = useMemo(() => {
    const eta = smoothedEta ?? rawEtaMinutes;
    if (eta == null) return null;

    const conf = etaConfidence;
    if (conf === "high") return `ETA ${formatMinutes(eta)}`;
    if (conf === "medium") return `ETA ~${Math.round(eta)} min (med)`;
    return `ETA ${formatMinutes(eta)} (approx)`;
  }, [smoothedEta, rawEtaMinutes, etaConfidence]);

  const activeMapHref = useMemo(() => {
    if (!active) return null;
    const delCoords = active?.assignedDeliveryBoy?.location?.coordinates;
    if (!delCoords?.length) return null;
    const [lng, lat] = delCoords;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }, [active]);

  if (dismissed || !active) return null;

  const isDelivered = active?.status === "delivered";
  const isOnTheWay = active?.status === "out of delivery";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] sm:w-full sm:max-w-md">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-lg px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-500">
              Live delivery
            </p>

            <p className="text-sm font-bold text-stone-900 truncate">
              {isDelivered
                ? "Order delivered"
                : active?.assignedDeliveryBoy?.fullName || "Finding driver..."}
            </p>

            <p className="text-xs text-stone-500 mt-0.5">
              {isDelivered
                ? "Thanks for ordering!"
                : etaLabel || (isOnTheWay ? "Updating location..." : "Waiting for driver assignment...")}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {activeMapHref && !isDelivered && (
              <a
                className="px-3 py-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-semibold border border-orange-100"
                href={activeMapHref}
                target="_blank"
                rel="noreferrer"
              >
                Track
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
          <div className="text-[11px] text-stone-500">
            {active.deliveryAddress?.text ? `To: ${active.deliveryAddress.text}` : ""}
          </div>

          <div className="flex flex-col items-end">
            <div className="text-[11px] text-stone-400">
              {isDelivered
                ? "Delivered"
                : isOnTheWay
                  ? "On the way"
                  : active.status}
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
                      etaConfidence === "high" ? "100%" : etaConfidence === "medium" ? "60%" : "35%",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

