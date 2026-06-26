import { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AUTH_ROUTES } from "../constants/endpoints";
import axiosInstance from "../lib/axios";

function SignUp() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("user");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    console.log("called");
    try {
      let response = await axiosInstance.post(AUTH_ROUTES.REGISTER, {
        fullName,
        email,
        password,
        mobile,
        role,
      });
      console.log(response);
      toast.success(response.data.message);
      setLoading(false);
      navigate("/login");
    } catch (error) {
      setLoading(false);
      toast.error(error.response.data.message);
      console.log(error.response.data.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* ── LEFT PANEL — decorative, hidden on mobile ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative bg-orange-500 flex-col justify-between p-12 overflow-hidden">
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px",
          }}
        />

        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-orange-400 opacity-40" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-600 opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-orange-600 opacity-20" />

        {/* Top logo */}
        <div className="relative z-10">
          <span className="text-white text-2xl font-bold tracking-tight">
            Order<span className="text-orange-100">Karo</span>
          </span>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <div className="text-orange-100 text-xs font-semibold tracking-[0.2em] uppercase mb-5">
            Delivering Joy Since 2024
          </div>
          <h2 className="text-white text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Hunger?
            <br />
            We've got
            <br />
            you covered.
          </h2>
          <p className="text-orange-100 text-sm leading-relaxed max-w-xs">
            Join thousands of foodies, restaurant partners, and delivery riders
            on India's fastest-growing food platform.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-10">
            {[
              ["10K+", "Restaurants"],
              ["2M+", "Happy Users"],
              ["30 min", "Avg Delivery"],
            ].map(([num, label]) => (
              <div key={label}>
                <div className="text-white text-xl font-bold">{num}</div>
                <div className="text-orange-200 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 text-orange-200 text-xs tracking-widest uppercase">
          Fresh · Fast · Reliable
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile brand header */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              Order<span className="text-orange-500">Karo</span>
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Hunger? We've got you covered.
            </p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-10">
            <h2 className="text-3xl font-bold text-stone-900 tracking-tight">
              Create account
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Fill in the details below to get started
            </p>
          </div>

          {/* Mobile heading */}
          <div className="lg:hidden mb-6">
            <h2 className="text-xl font-bold text-stone-800">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              It only takes a minute
            </p>
          </div>

          {/* ── FORM FIELDS ── */}

          {/* Full Name + Email — side by side on sm+ */}
          <div className="flex flex-col sm:flex-row gap-5 mb-5">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-[0.15em] mb-2">
                Full Name
              </label>
              <input
                type="text"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder:text-stone-600 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-[0.15em] mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder:text-stone-600 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Mobile + Password — side by side on sm+ */}
          <div className="flex flex-col sm:flex-row gap-5 mb-5">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-[0.15em] mb-2">
                Mobile
              </label>
              <div className="flex">
                <div className="bg-stone-100 border border-stone-200 border-r-0 rounded-l-xl px-3.5 flex items-center text-stone-500 text-sm font-medium shrink-0">
                  +91
                </div>
                <input
                  type="tel"
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-r-xl px-4 py-3 text-sm text-stone-800 placeholder:text-stone-600 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 min-w-0"
                  placeholder="10-digit number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  maxLength={10}
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-[0.15em] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder:text-stone-600 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 pr-11"
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-500 transition-colors cursor-pointer"
                  onClick={() => setShowPassword((prev) => !prev)}
                  type="button"
                >
                  {!showPassword ? (
                    <FaRegEye size={15} />
                  ) : (
                    <FaRegEyeSlash size={15} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Role — Desktop pill toggle */}
          <div className="mb-7 hidden sm:block">
            <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-[0.15em] mb-3">
              I'm joining as
            </label>
            <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
              {[
                { val: "user", label: "🍔 Foodie" },
                { val: "owner", label: "🍽️ Partner" },
                { val: "deliveryBoy", label: "🛵 Rider" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRole(val)}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    role === val
                      ? "bg-white text-orange-500 shadow-sm shadow-stone-200"
                      : "text-stone-600 hover:text-stone-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Role — Mobile select */}
          <div className="mb-7 sm:hidden">
            <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-[0.15em] mb-2">
              I'm joining as
            </label>
            <select
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all duration-200 cursor-pointer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">🍔 Foodie</option>
              <option value="owner">🍽️ Restaurant Partner</option>
              {/* <option value="deliveryBoy">🛵 Delivery Rider</option> */}
            </select>
          </div>

          {/* CTA */}
          <button
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-lg shadow-orange-100 mb-3"
            onClick={handleRegister}
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
                Creating account…
              </span>
            ) : (
              "Create Account →"
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-600 font-medium">or</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          {/* Google */}
          <button className="w-full bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98] text-stone-700 text-sm font-medium py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer mb-6">
            <FcGoogle size={18} />
            Continue with Google
          </button>

          {/* Sign in link */}
          <p className="text-center text-sm text-stone-600">
            Already have an account?{" "}
            <button
              className="text-orange-500 font-semibold hover:text-orange-600 transition-colors cursor-pointer"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </p>

          {/* Terms */}
          <p className="text-center text-[11px] text-stone-600 mt-4 leading-relaxed">
            By creating an account, you accept our{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-stone-600 transition-colors">
              Terms & Conditions
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
