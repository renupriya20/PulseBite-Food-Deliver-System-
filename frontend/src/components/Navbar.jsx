import { useState } from "react";
import { FaLocationDot, FaPlus } from "react-icons/fa6";
import { FiShoppingCart } from "react-icons/fi";
import { IoIosSearch } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import { TbReceipt2 } from "react-icons/tb";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AUTH_ROUTES } from "../constants/endpoints";
import axiosInstance from "../lib/axios";
import { setUserData } from "../redux/slices/userSlice";

function Navbar({ onOwnerOrdersClick }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const navigate = useNavigate();

  const dispatch = useDispatch();

  const { userData, city, cartItems } = useSelector((state) => state.user);
  const { shopData } = useSelector((state) => state.owner);

  const handleLogout = async () => {
    try {
      let response = await axiosInstance.post(AUTH_ROUTES.LOGOUT);

      dispatch(setUserData(null));
      toast.success(response.data.message);
    } catch (error) {
      //   console.log(error);
      toast.error(error?.response?.data?.message);
    }
  };

  return (
    <>
      {/* ── Navbar ── */}
      <header className="w-full h-16 fixed top-0 left-0 z-9999 bg-white border-b border-stone-100 shadow-sm">
        <div className="w-full h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Brand */}
          <h1 className="text-2xl font-bold tracking-tight shrink-0">
            <span className="text-stone-900">
              Pulse<span className="text-orange-500">Bite</span>
            </span>
          </h1>

          {/* Search bar — desktop only, user only */}
          {userData.role === "user" && (
            <div className="hidden md:flex flex-1 max-w-sm items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 gap-2 hover:border-orange-300 transition-colors">
              <div className="flex items-center gap-1.5 pr-3 border-r border-stone-200 shrink-0">
                <FaLocationDot size={13} className="text-orange-500" />
                <span className="text-xs text-stone-500 font-medium max-w-20 truncate">
                  {city}
                </span>
              </div>
              <IoIosSearch size={16} className="text-stone-400 shrink-0" />
              <input
                type="text"
                placeholder="Search delicious food…"
                className="flex-1 text-sm text-stone-700 bg-transparent outline-none placeholder:text-stone-300 min-w-0"
              />
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile search toggle — user only */}
            {userData.role === "user" && (
              <button
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors cursor-pointer"
                onClick={() => setShowSearch((p) => !p)}
              >
                {showSearch ? (
                  <RxCross2 size={16} />
                ) : (
                  <IoIosSearch size={18} />
                )}
              </button>
            )}

            {/* Delivery Boy: Online toggle indicator */}
            {userData.role === "deliveryBoy" && (
              <span
                className={`hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${userData.isOnline
                  ? "bg-green-100 text-green-700"
                  : "bg-stone-100 text-stone-500"
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${userData.isOnline ? "bg-green-500" : "bg-stone-400"}`}
                />
                {userData.isOnline ? "Online" : "Offline"}
              </span>
            )}

            {/* Owner: Add Item */}
            {userData.role === "owner" && shopData && (
              <>
                <button
                  className="hidden md:flex items-center gap-1.5 bg-orange-50 text-orange-500 hover:bg-orange-100 text-sm font-medium px-3.5 py-2 rounded-full transition-colors cursor-pointer"
                  onClick={() => navigate("/add-item")}
                >
                  <FaPlus size={13} />
                  Add Food Item
                </button>
                <button
                  className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors cursor-pointer"
                  onClick={() => navigate("/add-item")}
                >
                  <FaPlus size={15} />
                </button>
              </>
            )}

            {/* Owner: My Orders */}
            {userData.role === "owner" && (
              <>
                <button
                  className="hidden md:flex items-center gap-1.5 bg-orange-50 text-orange-500 hover:bg-orange-100 text-sm font-medium px-3.5 py-2 rounded-full transition-colors cursor-pointer"
                  onClick={onOwnerOrdersClick}
                >
                  <TbReceipt2 size={16} />
                  My Orders
                </button>
                <button
                  className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors cursor-pointer"
                  onClick={onOwnerOrdersClick}
                >
                  <TbReceipt2 size={17} />
                </button>
              </>
            )}

            {/* User: Cart */}
            {userData.role === "user" && (
              <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors cursor-pointer" onClick={() => navigate("/cart")}>
                <FiShoppingCart size={17} />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </button>
            )}

            {/* User: My Orders — desktop */}
            {userData.role === "user" && (
              <button
                className="hidden md:flex items-center gap-1.5 bg-orange-50 text-orange-500 hover:bg-orange-100 text-sm font-medium px-3.5 py-2 rounded-full transition-colors cursor-pointer"
                onClick={() => navigate("/my-orders")}
              >
                <TbReceipt2 size={16} />
                My Orders
              </button>
            )}

            {/* Avatar */}
            <button
              className="w-9 h-9 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center shadow-sm shadow-orange-200 hover:bg-orange-600 transition-colors cursor-pointer shrink-0"
              onClick={() => setShowInfo((p) => !p)}
            >
              {userData.fullName.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile search bar (drops below nav) ── */}
      {showSearch && userData.role === "user" && (
        <div className="md:hidden fixed top-16 left-0 w-full z-9998 bg-white border-b border-stone-100 shadow-sm px-4 py-3">
          <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 gap-2">
            <div className="flex items-center gap-1.5 pr-3 border-r border-stone-200 shrink-0">
              <FaLocationDot size={13} className="text-orange-500" />
              <span className="text-xs text-stone-500 font-medium max-w-17.5 truncate">
                {city}
              </span>
            </div>
            <IoIosSearch size={16} className="text-stone-400 shrink-0" />
            <input
              type="text"
              placeholder="Search delicious food…"
              className="flex-1 text-sm text-stone-700 bg-transparent outline-none placeholder:text-stone-300"
            />
          </div>
        </div>
      )}

      {/* ── Profile dropdown ── */}
      {showInfo && (
        <div className="fixed top-18 right-4 sm:right-6 w-48 bg-white rounded-2xl shadow-xl shadow-stone-200 border border-stone-100 p-4 flex flex-col gap-1 z-9999">
          {/* Name */}
          <p className="text-sm font-semibold text-stone-800 pb-2 border-b border-stone-100 mb-1">
            {userData.fullName}
          </p>

          {/* My Orders — mobile, user only */}
          {userData.role === "user" && (
            <button
              className="md:hidden text-left text-sm text-stone-600 hover:text-orange-500 font-medium py-1.5 transition-colors cursor-pointer"
              onClick={() => navigate("/my-orders")}
            >
              My Orders
            </button>
          )}

          <button
            className="text-left text-sm text-orange-500 hover:text-orange-600 font-semibold py-1.5 transition-colors cursor-pointer"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      )}

      {/* Spacer so content doesn't hide behind fixed nav */}
      <div className="h-16" />
    </>
  );
}

export default Navbar;
