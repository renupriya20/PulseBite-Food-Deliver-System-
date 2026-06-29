import { useSignIn } from "@clerk/react";
import { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AUTH_ROUTES } from "../constants/endpoints";
import axiosInstance from "../lib/axios";
import { setUserData } from "../redux/slices/userSlice";

function SignIn() {
  const dispatch = useDispatch();
  const { signIn } = useSignIn();

  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await axiosInstance.post(AUTH_ROUTES.LOGIN, {
        email,
        password,
      });
      console.log("result: ", result);
      toast.success(result.data.message);
      dispatch(setUserData(result.data.user));
      setLoading(false);
    } catch (error) {
      console.log("error: ", error);
      toast.error(error?.response?.data?.message);
      console.log("error?.response?.data: ", error?.response);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signIn.create({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
      });

      if (result.status === "complete") {
        const ssoResult = await axiosInstance.post(AUTH_ROUTES.LOGIN_WITH_SSO, {
          clerkId: result.createdSessionId,
        });
        toast.success(ssoResult.data.message);
        dispatch(setUserData(ssoResult.data.user));
        navigate("/");
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast.error(error.message || "Google login failed");
    } finally {
      setLoading(false);
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
            Pulse<span className="text-orange-100">Bite</span>
          </span>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <div className="text-orange-100 text-xs font-semibold tracking-[0.2em] uppercase mb-5">
            Welcome Back
          </div>
          <h2 className="text-white text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Good to
            <br />
            see you
            <br />
            again. 👋
          </h2>
          <p className="text-orange-100 text-sm leading-relaxed max-w-xs">
            Your favorite restaurants, your favorite meals — all waiting for
            you. Sign in and let's get you fed.
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
        <div className="w-full max-w-sm">
          {/* Mobile brand header */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">
              Pulse<span className="text-orange-500">Bite</span>
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Good to see you again 👋
            </p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-10">
            <h2 className="text-3xl font-bold text-stone-900 tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Sign in to continue to your account
            </p>
          </div>

          {/* Mobile heading */}
          <div className="lg:hidden mb-7">
            <h2 className="text-xl font-bold text-stone-800">Sign in</h2>
            <p className="mt-1 text-sm text-stone-600">
              Enter your credentials to continue
            </p>
          </div>

          {/* Email */}
          <div className="mb-5">
            <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-[0.15em] mb-2">
              Email
            </label>
            <input
              type="email"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder:text-stone-600 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200"
              placeholder="your@email.com"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              required
            />
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="block text-[10px] font-semibold text-stone-600 uppercase tracking-[0.15em] mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder:text-stone-600 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 pr-11"
                placeholder="Your password"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
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

          {/* Forgot Password */}
          <div className="text-right mb-7">
            <button
              className="text-xs text-orange-400 hover:text-orange-500 font-medium transition-colors cursor-pointer"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In CTA */}
          <button
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-lg shadow-orange-100 mb-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            onClick={handleLogin}
            disabled={loading}
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
                Signing in…
              </span>
            ) : (
              "Sign In →"
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-600 font-medium">or</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          {/* Google */}
          <button
            className="w-full bg-white border border-stone-200 hover:border-stone-300 
  hover:bg-stone-50 active:scale-[0.98] text-stone-700 text-sm font-medium 
  py-3.5 rounded-xl flex items-center justify-center gap-2.5 
  transition-all duration-200 cursor-pointer mb-7"
            onClick={handleGoogleLogin}
            // disabled={!isLoaded}
            type="button"
          >
            <FcGoogle size={18} />
            Sign in with Google
          </button>

          {/* Sign up link */}
          <p className="text-center text-sm text-stone-600">
            Don't have an account?{" "}
            <button
              className="text-orange-500 font-semibold hover:text-orange-600 transition-colors cursor-pointer"
              onClick={() => navigate("/register")}
            >
              Sign up
            </button>
          </p>

          {/* Terms */}
          <p className="text-center text-[11px] text-stone-600 mt-4 leading-relaxed">
            By signing in, you agree to our{" "}
            <span className="underline underline-offset-2 cursor-pointer hover:text-stone-600 transition-colors">
              Terms & Conditions
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
