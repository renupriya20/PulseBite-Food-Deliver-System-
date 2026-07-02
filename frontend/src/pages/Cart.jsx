import { IoIosArrowRoundBack } from "react-icons/io";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CartItemCard from "../components/CartItemCard";

function Cart() {
  const navigate = useNavigate();
  const { cartItems, totalAmount } = useSelector((state) => state.user);

  const deliveryFee = 40;
  const platformFee = 10;
  const grandTotal = totalAmount + deliveryFee + platformFee;

  return (
    <div className="min-h-screen w-full bg-stone-50 flex flex-col items-center px-4 py-10">
      {/* Back button */}
      <div className="w-full max-w-2xl mb-6">
        <button
          className="flex items-center gap-1.5 text-stone-400 hover:text-orange-500 transition-colors cursor-pointer group"
          onClick={() => navigate("/")}
        >
          <IoIosArrowRoundBack
            size={20}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          <span className="text-xs font-medium uppercase tracking-widest">
            Back
          </span>
        </button>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-1">
            Your Order
          </p>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Cart
            <span className="ml-2 text-sm font-semibold text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full">
              {cartItems.length} items
            </span>
          </h1>
        </div>

        {/* Empty state */}
        {cartItems.length === 0 ? (
          <div className="w-full bg-white border border-stone-200 rounded-2xl p-12 flex flex-col items-center text-center shadow-sm">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-1">
              Empty
            </p>
            <h2 className="text-lg font-bold text-stone-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-sm text-stone-400 mb-7">
              Add some delicious items to get started
            </p>
            <button
              className="bg-stone-900 hover:bg-orange-500 text-white text-sm font-semibold px-8 py-3.5 rounded-xl tracking-wide transition-all duration-300 cursor-pointer"
              onClick={() => navigate("/")}
            >
              Browse Food →
            </button>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <div className="flex flex-col gap-3">
              {cartItems.map((item, index) => (
                <CartItemCard data={item} key={index} />
              ))}
            </div>

            {/* Bill summary */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-400 mb-4">
                Bill Summary
              </p>

              <div className="flex flex-col gap-2.5">
                {[
                  ["Item Total", `₹${totalAmount}`],
                  ["Delivery Fee", `₹${deliveryFee}`],
                  ["Platform Fee", `₹${platformFee}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-stone-500">{label}</span>
                    <span className="text-sm font-medium text-stone-700">
                      {value}
                    </span>
                  </div>
                ))}

                <div className="border-t border-stone-100 pt-3 mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-900">
                    Grand Total
                  </span>
                  <span className="text-base font-bold text-orange-500">
                    ₹{grandTotal}
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout button */}
            <button
              className="w-full bg-stone-900 hover:bg-orange-500 active:scale-[0.98] text-white font-semibold py-4 rounded-xl text-sm tracking-wide transition-all duration-300 cursor-pointer shadow-sm"
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout · ₹{grandTotal}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;
