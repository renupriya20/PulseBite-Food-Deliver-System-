import axios from "axios";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { FaCreditCard } from "react-icons/fa";
import { FaMobileScreenButton } from "react-icons/fa6";
import { IoIosArrowRoundBack } from "react-icons/io";
import { IoLocationSharp, IoSearchOutline } from "react-icons/io5";
import { MdDeliveryDining } from "react-icons/md";
import { TbCurrentLocation } from "react-icons/tb";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ORDER_ROUTES } from "../constants/endpoints";
import axiosInstance from "../lib/axios";
import { setAddress, setLocation } from "../redux/slices/mapSlice";

// ── Must be outside main component ───────────────────────────────
function RecenterMap({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location?.lat && location?.lon) {
      map.setView([location.lat, location.lon], 16, { animate: true });
    }
  }, [location, map]);
  return null;
}

// ── Step indicator ────────────────────────────────────────────────
function Step({ number, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${done
            ? "bg-orange-500 text-white"
            : active
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-400"
          }`}
      >
        {done ? "✓" : number}
      </div>
      <span
        className={`text-xs font-semibold uppercase tracking-widest hidden sm:block ${active ? "text-stone-900" : "text-stone-400"}`}
      >
        {label}
      </span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────
function Checkout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { location, address } = useSelector((state) => state.map);
  const { cartItems, totalAmount, userData } = useSelector(
    (state) => state.user,
  );

  const [addressInput, setAddressInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [activeStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
  const deliveryFee = totalAmount > 500 ? 0 : 40;
  const platformFee = 10;
  const grandTotal = totalAmount + deliveryFee + platformFee;

  // Safe coords fallback
  const lat = location?.lat ?? 28.6139;
  const lon = location?.lon ?? 77.209;

  useEffect(() => {
    if (address) setAddressInput(address);
  }, [address]);

  const onDragEnd = (e) => {
    const { lat, lng } = e.target._latlng;
    dispatch(setLocation({ lat, lon: lng }));
    getAddressByLatLng(lat, lng);
  };

  const getCurrentLocation = () => {
    const latitude = userData.location.coordinates[1];
    const longitude = userData.location.coordinates[0];
    dispatch(setLocation({ lat: latitude, lon: longitude }));
    getAddressByLatLng(latitude, longitude);
  };

  const getAddressByLatLng = async (lat, lng) => {
    try {
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${apiKey}`,
      );
      dispatch(setAddress(result?.data?.results[0].address_line2));
    } catch (error) {
      console.log(error);
    }
  };

  const getLatLngByAddress = async () => {
    try {
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(addressInput)}&apiKey=${apiKey}`,
      );
      console.log("result: ", result);
      const { lat, lon } = result.data.features[0].properties;
      dispatch(setLocation({ lat, lon }));
    } catch (error) {
      console.log(error);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const result = await axiosInstance.post(ORDER_ROUTES.PLACE_ORDER, {
        paymentMethod,
        deliveryAddress: {
          text: addressInput,
          latitude: location.lat,
          longitude: location.lon,
        },
        totalAmount: grandTotal,
        cartItems,
      });
      if (paymentMethod === "cod") {
        navigate("/order-placed", { state: { order: result.data.newOrder } });
      } else {
        // openRazorpayWindow(result.data.orderId, result.data.razorOrder);
      }
    } catch (error) {
      console.log(error.response);
    } finally {
      setLoading(false);
    }
  };

  // const openRazorpayWindow = (orderId, razorOrder) => {
  //   const options = {
  //     key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  //     amount: razorOrder.amount,
  //     currency: "INR",
  //     name: "OrderKaro",
  //     description: "Food Delivery",
  //     order_id: razorOrder.id,
  //     handler: async function (response) {
  //       try {
  //         const result = await axios.post(
  //           `${serverUrl}/api/order/verify-payment`,
  //           { razorpay_payment_id: response.razorpay_payment_id, orderId },
  //           { withCredentials: true },
  //         );
  //         // dispatch(addMyOrder(result.data));
  //         navigate("/order-placed");
  //       } catch (error) {
  //         console.log(error);
  //       }
  //     },
  //   };
  //   const rzp = new window.Razorpay(options);
  //   rzp.open();
  // };

  return (
    <div className="min-h-screen w-full bg-stone-50">
      {/* ── Top bar ── */}
      <div className="w-full bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button
          className="flex items-center gap-1.5 text-stone-400 hover:text-orange-500 transition-colors cursor-pointer group"
          onClick={() => navigate("/cart")}
        >
          <IoIosArrowRoundBack
            size={20}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span className="text-xs font-medium uppercase tracking-widest">
            Back
          </span>
        </button>

        <div className="flex items-center gap-3">
          <Step
            number={1}
            label="Location"
            active={activeStep === 1}
            done={activeStep > 1}
          />
          <div className="w-8 h-px bg-stone-200" />
          <Step
            number={2}
            label="Payment"
            active={activeStep === 2}
            done={activeStep > 2}
          />
          <div className="w-8 h-px bg-stone-200" />
          <Step
            number={3}
            label="Review"
            active={activeStep === 3}
            done={false}
          />
        </div>

        <div className="w-16" />
      </div>

      {/* ── Body ── */}
      <div className="w-full max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">
          {/* Delivery location */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-4 border-b border-stone-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <IoLocationSharp className="text-orange-500 text-sm" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                  Step 1
                </p>
                <h2 className="text-sm font-bold text-stone-900">
                  Delivery Location
                </h2>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200"
                  placeholder="Enter delivery address..."
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                />
                <button
                  onClick={getLatLngByAddress}
                  className="shrink-0 w-10 h-10 bg-stone-900 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center transition-colors duration-200 cursor-pointer"
                >
                  <IoSearchOutline size={16} />
                </button>
                <button
                  onClick={getCurrentLocation}
                  className="shrink-0 w-10 h-10 bg-orange-50 hover:bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center transition-colors duration-200 cursor-pointer"
                >
                  <TbCurrentLocation size={16} />
                </button>
              </div>

              {/* Map */}
              <div className="w-full h-56 rounded-xl overflow-hidden border border-stone-200 relative">
                <MapContainer
                  style={{ width: "100%", height: "100%" }}
                  center={[lat, lon]}
                  zoom={16}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterMap location={location} />
                  <Marker
                    position={[lat, lon]}
                    draggable
                    eventHandlers={{ dragend: onDragEnd }}
                  />
                </MapContainer>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-999 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-3 py-1 rounded-full pointer-events-none">
                  Drag pin to adjust location
                </div>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-4 border-b border-stone-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <FaCreditCard className="text-orange-500 text-xs" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                  Step 2
                </p>
                <h2 className="text-sm font-bold text-stone-900">
                  Payment Method
                </h2>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("cod")}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 cursor-pointer ${paymentMethod === "cod"
                    ? "border-orange-500 bg-orange-50 shadow-sm shadow-orange-100"
                    : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
              >
                <span className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <MdDeliveryDining className="text-green-600 text-xl" />
                </span>
                <div>
                  <p className="text-sm font-bold text-stone-900">
                    Cash on Delivery
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Pay when food arrives
                  </p>
                </div>
                {paymentMethod === "cod" && (
                  <span className="ml-auto w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                )}
              </button>

              <button
                onClick={() => setPaymentMethod("online")}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 cursor-pointer ${paymentMethod === "online"
                    ? "border-orange-500 bg-orange-50 shadow-sm shadow-orange-100"
                    : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
              >
                <span className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <FaMobileScreenButton className="text-purple-600 text-lg" />
                </span>
                <div>
                  <p className="text-sm font-bold text-stone-900">UPI / Card</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Pay securely online
                  </p>
                </div>
                {paymentMethod === "online" && (
                  <span className="ml-auto w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right column — sticky order summary ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-stone-100">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-0.5">
                Step 3
              </p>
              <h2 className="text-sm font-bold text-stone-900">
                Order Summary
              </h2>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {cartItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-stone-800 capitalize truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {item.shopName} · ×{item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-stone-800 shrink-0">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-100" />

              <div className="flex flex-col gap-2">
                {[
                  ["Subtotal", `₹${totalAmount}`],
                  [
                    "Delivery Fee",
                    deliveryFee === 0 ? "🎉 Free" : `₹${deliveryFee}`,
                  ],
                  ["Platform Fee", `₹${platformFee}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-stone-500">{label}</span>
                    <span
                      className={`text-xs font-medium ${value === "🎉 Free" ? "text-green-500" : "text-stone-700"}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900">
                  Grand Total
                </span>
                <span className="text-base font-black text-orange-500">
                  ₹{grandTotal}
                </span>
              </div>

              {totalAmount <= 500 && totalAmount > 0 && (
                <p className="text-[10px] text-stone-400 text-center">
                  Add ₹{500 - totalAmount} more for{" "}
                  <span className="text-green-500 font-semibold">
                    free delivery
                  </span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={loading || cartItems.length === 0}
            className="w-full bg-stone-900 hover:bg-orange-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-sm tracking-wide transition-all duration-300 cursor-pointer shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Placing order…
              </span>
            ) : paymentMethod === "cod" ? (
              "Place Order →"
            ) : (
              "Pay & Place Order →"
            )}
          </button>

          <p className="text-[10px] text-stone-400 text-center">
            By placing order you agree to our terms & conditions
          </p>
        </div>
      </div>
    </div>
  );
}

export default Checkout;
