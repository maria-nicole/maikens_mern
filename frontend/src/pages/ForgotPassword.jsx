import axios from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

/* Where a locked-out customer starts over.

   The reply is deliberately the same whether or not the address has an account, so this
   page can never be used to find out who shops here. That is why the success panel talks
   about "if that email has an account" too. */

const inputClass =
  "w-full p-3 border border-gray-200 rounded-md bg-white text-sm text-neutral-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500/89 focus:border-yellow-600/89 transition-colors";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post("/api/users/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the reset link. Please try again.");
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
          {sent ? (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-600/10 text-yellow-700/89">
                <MailCheck size={22} />
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-neutral-800">Check your email</h1>
              <p className="mt-2 text-zinc-600">
                If that email has an account, we&rsquo;ve sent a reset link. It expires in 1 hour.
              </p>
              <p className="mt-4 text-sm text-zinc-500">
                Nothing arrived? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-medium text-yellow-700/89 hover:underline"
                >
                  try another email
                </button>
                .
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-800 md:text-4xl">Forgot your password?</h1>
              <p className="mt-2 mb-8 text-zinc-600">
                Enter the email on your account and we&rsquo;ll send you a link to set a new password.
              </p>

              {error && (
                <p role="alert" className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-5 text-sm">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 text-white bg-yellow-600/89 border border-yellow-600/89 rounded-md font-medium text-base px-5 py-3 mt-2 hover:bg-white hover:text-yellow-600/89 duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
