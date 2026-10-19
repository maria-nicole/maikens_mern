import axios from "axios";
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft, Sparkles, PackageSearch, MessageCircle } from "lucide-react";
import GoogleAuthButton from "../components/GoogleAuthButton";

import loginImg from "../assets/img_maikens_1/471228577.jpg";

// Same three customer-facing highlights shown on the homepage
const HIGHLIGHTS = [
  { icon: Sparkles, text: "Design your own gown with AI-powered previews" },
  { icon: PackageSearch, text: "Track your order from production to pick-up" },
  { icon: MessageCircle, text: "Message the boutique anytime" },
];

// Where each user level lands after signing in
// (Admin/Owner, Staff/Owner, Customer — per the manuscript's three user levels)
const ROLE_HOME = {
  admin: "/admin",
  staff: "/staff",
  customer: "/",
};

const inputClass =
  "w-full p-3 border border-gray-200 rounded-md bg-white text-sm text-neutral-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/89 focus:border-yellow-600/89 transition-colors";

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/users/login", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      localStorage.setItem("token", res.data.token);
      axios.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
      setUser(res.data);

      // Send people back to the page they were trying to reach (e.g. checkout),
      // otherwise to their role's home.
      const cameFrom = location.state?.from?.pathname;
      navigate(cameFrom || ROLE_HOME[res.data.role] || "/", { replace: true });

    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Image panel — desktop only, so mobile goes straight to the form */}
      <div className="relative hidden lg:block">
        <img src={loginImg} alt="Maikens gown" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/30 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-white">
          <p className="text-xs uppercase tracking-widest text-orange-100/89 font-semibold mb-3">
            Maikens Gown &amp; Barong
          </p>
          <h2 className="text-4xl xl:text-5xl font-bold tracking-tight mb-8 max-w-md">
            Your perfect gown, made for you.
          </h2>
          <ul className="space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Icon size={15} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col bg-white">
        <div className="px-6 pt-6 sm:px-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-yellow-700/89 duration-100"
          >
            <ArrowLeft size={15} />
            Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-sm">
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-800 md:text-4xl">Welcome back</h1>
            <p className="mt-2 mb-8 text-zinc-600">Log in to order, track, and customize your gowns.</p>

            {error && (
              <p
                role="alert"
                className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-5 text-sm"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  className={inputClass}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs text-yellow-700/89 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    className={`${inputClass} pr-11`}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-700/89"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white bg-yellow-600/89 border border-yellow-600/89 rounded-md font-medium text-base px-5 py-3 mt-2 hover:bg-white hover:text-yellow-600/89 duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Signing in…" : "Log In"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <hr className="flex-1 border-gray-200" />
            </div>
            <GoogleAuthButton setUser={setUser} onError={setError} />

            <p className="text-center text-sm text-gray-500 mt-8">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-semibold text-yellow-700/89 hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="px-6 pb-6 text-center text-xs text-gray-400">
          © 2026 Maikens Gown &amp; Barong. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;