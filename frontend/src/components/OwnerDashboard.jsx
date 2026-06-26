import { useEffect, useState } from "react";
import { FaPen, FaUtensils } from "react-icons/fa";
import { TbReceipt2 } from "react-icons/tb";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "./Navbar";
import OwnerItemCard from "./OwnerItemCard";
import OwnerOrders from "./OwnerOrders";

function OwnerDashboard() {
  const { shopData } = useSelector((state) => state.owner);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "orders" ? "orders" : "menu",
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "orders" || tab === "menu") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "menu" ? {} : { tab });
  };

  return (
    <div className="w-full min-h-screen bg-stone-50 flex flex-col items-center pb-16">
      <Navbar onOwnerOrdersClick={() => switchTab("orders")} />

      {/* ── NO SHOP ── */}
      {!shopData && (
        <div className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl shadow-sm p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-6">
              <FaUtensils className="text-orange-500 w-6 h-6" />
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-1">
              Get Started
            </p>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight mb-2">
              List your restaurant
            </h2>
            <p className="text-sm text-stone-400 leading-relaxed mb-8">
              Join our platform and reach thousands of hungry customers in your
              city every day.
            </p>

            <button
              className="w-full bg-stone-900 hover:bg-orange-500 active:scale-[0.98] text-white text-sm font-semibold py-3.5 rounded-xl tracking-wide transition-all duration-300 cursor-pointer shadow-sm"
              onClick={() => navigate("/create-edit-shop")}
            >
              Get Started →
            </button>
          </div>
        </div>
      )}

      {/* ── HAS SHOP ── */}
      {shopData && (
        <div className="w-full max-w-3xl flex flex-col gap-6 px-4 sm:px-6 pt-8">
          {/* Page heading */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <FaUtensils className="text-orange-500 w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                Owner Dashboard
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight leading-tight">
                Welcome back, {shopData.name}
              </h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-white border border-stone-200 rounded-xl p-1">
            {[
              ["menu", "Menu", FaUtensils],
              ["orders", "Orders", TbReceipt2],
            ].map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === key
                    ? "bg-stone-900 text-white"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {activeTab === "orders" && <OwnerOrders />}

          {activeTab === "menu" && (
            <>
              {/* Shop card */}
              <div className="w-full bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300 relative">
                <button
                  className="absolute top-4 right-4 z-10 w-9 h-9 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-md shadow-orange-200 transition-colors cursor-pointer"
                  onClick={() => navigate("/create-edit-shop")}
                >
                  <FaPen size={13} />
                </button>

                <div className="w-full h-44 sm:h-60 overflow-hidden bg-stone-100">
                  <img
                    src={shopData.image}
                    alt={shopData.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-5 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-stone-900 mb-1">
                    {shopData.name}
                  </h2>
                  <p className="text-sm text-stone-400 font-medium">
                    {shopData.city}, {shopData.state}
                  </p>
                  <p className="text-sm text-stone-400 mt-0.5">
                    {shopData.address}
                  </p>

                  <div className="flex gap-8 mt-5 pt-5 border-t border-stone-100">
                    {[
                      ["Total Items", shopData.items.length],
                      ["Status", "Active"],
                      ["Rating", "4.8 ★"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-0.5">
                          {label}
                        </p>
                        <p className="text-sm font-bold text-stone-800">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {shopData.items.length === 0 && (
                <div className="w-full bg-white border border-stone-200 rounded-2xl p-10 flex flex-col items-center text-center shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-5">
                    <FaUtensils className="text-orange-500 w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-1">
                    Menu Empty
                  </p>
                  <h2 className="text-lg font-bold text-stone-900 mb-2">
                    No menu items yet
                  </h2>
                  <p className="text-sm text-stone-400 leading-relaxed mb-7 max-w-xs">
                    Share your delicious creations with customers by adding your
                    first food item.
                  </p>
                  <button
                    className="bg-stone-900 hover:bg-orange-500 active:scale-[0.98] text-white text-sm font-semibold px-8 py-3.5 rounded-xl tracking-wide transition-all duration-300 cursor-pointer shadow-sm"
                    onClick={() => navigate("/add-item")}
                  >
                    Add Food Item →
                  </button>
                </div>
              )}

              {shopData.items.length > 0 && (
                <div className="w-full flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-stone-800">
                      Menu Items
                      <span className="ml-2 text-[10px] font-semibold text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full">
                        {shopData.items.length}
                      </span>
                    </h2>
                    <button
                      className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 uppercase tracking-widest transition-colors cursor-pointer"
                      onClick={() => navigate("/add-item")}
                    >
                      + Add Item
                    </button>
                  </div>

                  {shopData.items.map((item, index) => (
                    <OwnerItemCard data={item} key={index} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default OwnerDashboard;
