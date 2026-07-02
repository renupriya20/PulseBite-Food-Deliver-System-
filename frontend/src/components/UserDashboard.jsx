import { useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CategoryCard from "./CategoryCard";
import FoodCard from "./FoodCard";
import Navbar from "./Navbar";

// ── Static category list (for browse row) ────────────────────────
const CATEGORIES = [
  {
    category: "Pizza",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300",
  },
  {
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300",
  },
  {
    category: "Desserts",
    image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300",
  },
  {
    category: "Chinese",
    image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300",
  },
  {
    category: "South Indian",
    image: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=300",
  },
  {
    category: "Snacks",
    image: "https://images.unsplash.com/photo-1776178393311-a4618b481064?w=300",
  },
  {
    category: "Main Course",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300",
  },
  {
    category: "Sandwiches",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300",
  },
  {
    category: "Fast Food",
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=300",
  },
  {
    category: "North Indian",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300",
  },
];

// ── Reusable scroll row ───────────────────────────────────────────
function ScrollRow({ children, label, badge }) {
  const ref = useRef();
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 0);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const onRefMount = (el) => {
    ref.current = el;
    if (el) {
      updateArrows();
      el.addEventListener("scroll", updateArrows);
    }
  };

  const scroll = (dir) =>
    ref.current?.scrollBy({
      left: dir === "left" ? -220 : 220,
      behavior: "smooth",
    });

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-0.5">
            {label[0]}
          </p>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            {label[1]}
          </h2>
        </div>
        {badge != null && (
          <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className={`shrink-0 w-8 h-8 bg-white border border-stone-200 rounded-full shadow-sm flex items-center justify-center text-stone-400 hover:text-orange-500 hover:border-orange-200 transition-all cursor-pointer ${
            showLeft
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => scroll("left")}
        >
          <FaChevronLeft size={11} />
        </button>

        <div
          ref={onRefMount}
          className="flex-1 flex overflow-x-auto gap-3 pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {children}
        </div>

        <button
          className={`shrink-0 w-8 h-8 bg-white border border-stone-200 rounded-full shadow-sm flex items-center justify-center text-stone-400 hover:text-orange-500 hover:border-orange-200 transition-all cursor-pointer ${
            showRight
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => scroll("right")}
        >
          <FaChevronRight size={11} />
        </button>
      </div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────
function UserDashboard() {
  const { city, shopsInMyCity, itemsInMyCity } = useSelector(
    (state) => state.user,
  );
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("All");

  // itemsInMyCity already scoped to city by API
  const allItems = itemsInMyCity ?? [];

  // Filter items by active category
  const filteredItems =
    activeCategory === "All"
      ? allItems
      : allItems.filter(
          (item) =>
            item.category === activeCategory.toLowerCase().replace(" ", "-"),
        );

  return (
    <div className="w-full min-h-screen bg-stone-50 flex flex-col items-center pb-16">
      <Navbar />

      <div className="w-full max-w-6xl flex flex-col gap-10 px-4 sm:px-6 pt-6">
        {/* ── Hero Banner ── */}
        <section className="w-full bg-orange-500 rounded-2xl px-6 py-8 sm:px-10 sm:py-10 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-orange-400 rounded-full opacity-40" />
          <div className="absolute -bottom-10 -right-4 w-28 h-28 bg-orange-600 rounded-full opacity-30" />
          <div className="relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-100 mb-2">
              {city}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-1">
              Hungry? We've got you 🍔
            </h1>
            <p className="text-sm text-orange-100 font-medium">
              Explore the best food around you
            </p>
          </div>
        </section>

        {/* ── Categories ── */}
        <ScrollRow label={["Browse", "What are you craving?"]}>
          {CATEGORIES.map((cate, index) => (
            <CategoryCard
              key={index}
              name={cate.category}
              image={cate.image}
              active={activeCategory === cate.category}
              onClick={() => setActiveCategory(cate.category)}
            />
          ))}
        </ScrollRow>

        {/* ── Best Shops ── */}
        <ScrollRow
          label={["Near You", `Best shops in ${city}`]}
          badge={`${shopsInMyCity?.length ?? 0} shops`}
        >
          {shopsInMyCity?.map((shop, index) => (
            <CategoryCard
              key={index}
              name={shop.name}
              image={shop.image}
              onClick={() => navigate(`/shop/${shop._id}`)}
            />
          ))}
        </ScrollRow>

        {/* ── Food Items Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-0.5">
                {activeCategory === "All" ? "All Items" : activeCategory}
              </p>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                Suggested for you
              </h2>
            </div>
            <span className="text-xs font-semibold text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">
              {filteredItems.length} items
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="w-full py-16 flex flex-col items-center text-center">
              <p className="text-4xl mb-3">🍽️</p>
              <p className="text-sm font-semibold text-stone-400">
                No items found
                {activeCategory !== "All"
                  ? ` for ${activeCategory}`
                  : " in your city"}
              </p>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((item, index) => (
                <FoodCard key={index} data={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default UserDashboard;
