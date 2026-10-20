import axios from "axios";
import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft, Check, ShoppingBag, Camera, PackageSearch } from "lucide-react";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { PASSWORD_RULES, unmetPasswordRules } from "../components/account/passwordRules";

import registerImg from "../assets/img_maikens_1/196322087.jpg";

const PERKS = [
  { icon: ShoppingBag, text: "Save gowns to your cart and check out with GCash" },
  { icon: Camera, text: "Try gowns on virtually with your own photo" },
  { icon: PackageSearch, text: "Follow every order's status in real time" },
];

// Where each user level lands after signing in
const ROLE_HOME = { admin: "/admin", staff: "/staff", customer: "/" };

const inputClass =
  "w-full p-3 border border-gray-200 rounded-md bg-white text-sm text-neutral-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/89 focus:border-yellow-600/89 transition-colors";

const Register = ({ setUser }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  // Live password checklist so people know the rules before submitting
  const rules = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(formData.password) })),
    [formData.password]
  );

  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch =
    formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!rules.every((r) => r.met)) {
      // Name what is still missing, rather than making them guess from a generic refusal
      const missing = unmetPasswordRules(formData.password);
      setError(`Your password still needs ${missing.join(", ")}.`);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("/api/users/register", {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // With no mail provider the account is created ready to use, so sign them in.
      if (!data.needsVerification) {
        localStorage.setItem("token", data.token);
        axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        setUser(data);
        navigate(ROLE_HOME[data.role] || "/", { replace: true });
        return;
      }

      navigate("/verify-email", {
        state: { email: data.email, emailSent: data.emailSent },
        replace: true,
      });

    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Image panel — desktop only */}
      <div className="relative hidden lg:block">
        <img src={registerImg} alt="Maikens gown" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-neutral-900/30 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-white">
          <p className="text-xs uppercase tracking-widest text-orange-100/89 font-semibold mb-3">
            Maikens Gown &amp; Barong
          </p>
          <h2 className="text-4xl xl:text-5xl font-bold tracking-tight mb-8 max-w-md">
            Join us and start designing.
          </h2>
          <ul className="space-y-3">
            {PERKS.map(({ icon: Icon, text }) => (
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

        <div className="flex-1 flex items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-sm">
            <h1 className="mt-6 mb-5 text-3xl font-bold tracking-tight text-neutral-800 md:text-4xl">Create your account</h1>


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
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  className={inputClass}
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                />
              </div>

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
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    className={`${inputClass} pr-11`}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:text-yellow-700/89 focus:outline-none focus:ring-2 focus:ring-yellow-700/40"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {formData.password.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {rules.map((rule) => (
                      <li
                        key={rule.label}
                        className={`flex items-center gap-1 text-xs ${rule.met ? "text-green-700" : "text-gray-400"}`}
                      >
                        <Check size={12} className={rule.met ? "opacity-100" : "opacity-30"} />
                        {rule.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    className={`${inputClass} pr-11 ${passwordsMismatch ? "border-red-300 focus:border-red-400 focus:ring-red-300" : ""}`}
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-type your password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:text-yellow-700/89 focus:outline-none focus:ring-2 focus:ring-yellow-700/40"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordsMismatch && <p className="mt-1.5 text-xs text-red-600">Passwords don&apos;t match yet.</p>}
                {passwordsMatch && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-green-700">
                    <Check size={12} /> Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white bg-yellow-600/89 border border-yellow-600/89 rounded-md font-medium text-base px-5 py-3 mt-2 hover:bg-white hover:text-yellow-600/89 duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <hr className="flex-1 border-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <hr className="flex-1 border-gray-200" />
            </div>
            <GoogleAuthButton setUser={setUser} onError={setError} />

            <p className="text-center text-sm text-gray-500 mt-7">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-yellow-700/89 hover:underline">
                Log in
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

export default Register;