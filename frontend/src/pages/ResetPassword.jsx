import axios from "axios";
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

const ROLE_HOME = { admin: "/admin", staff: "/staff", customer: "/" };

/* The page the emailed link opens.

   The token and email both come from the link's query string, and both are checked on the
   server — the page holds no secret of its own. On success the customer is signed straight
   in, since they have just proved they control the inbox. */

const inputClass =
  "w-full p-3 border border-gray-200 rounded-md bg-white text-sm text-neutral-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/89 focus:border-yellow-600/89 transition-colors";

const ResetPassword = ({ setUser }) => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const email = params.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // A link without both halves cannot work, so send them back to start over
  if (!token || !email) return <Navigate to="/forgot-password" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8 || !/\d/.test(password)) {
      return setError("Password must be at least 8 characters and contain a number.");
    }
    if (password !== confirm) return setError("Those passwords don't match.");

    setLoading(true);
    try {
      const res = await axios.post("/api/users/reset-password", { email, token, password });
      localStorage.setItem("token", res.data.token);
      axios.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
      setUser(res.data);
      navigate(ROLE_HOME[res.data.role] || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reset the password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="px-6 pt-6 sm:px-10">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-yellow-700/89 duration-100"
        >
          <ArrowLeft size={15} />
          Back to log in
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-800 md:text-4xl">Set a new password</h1>
          <p className="mt-2 mb-8 text-zinc-600">
            Choose a password for <strong className="font-medium text-neutral-800">{email}</strong>.
          </p>

          {error && (
            <p role="alert" className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-5 text-sm">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  className={`${inputClass} pr-11`}
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters, with a number"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:text-yellow-700/89 focus:outline-none focus:ring-2 focus:ring-yellow-700/40"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <input
                id="confirm"
                className={inputClass}
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white bg-yellow-600/89 border border-yellow-600/89 rounded-md font-medium text-base px-5 py-3 mt-2 hover:bg-white hover:text-yellow-600/89 duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Saving…" : "Save new password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
