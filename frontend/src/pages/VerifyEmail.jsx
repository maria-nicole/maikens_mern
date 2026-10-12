import axios from "axios";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

const ROLE_HOME = { admin: "/admin", staff: "/staff", customer: "/" };
const RESEND_SECONDS = 60;

export default function VerifyEmail({ setUser }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { email = "", emailSent, from } = location.state || {};

    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState(
        emailSent === false
            ? "We couldn't send the email just now. Tap “Resend code” to try again."
            : ""
    );
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(emailSent ? RESEND_SECONDS : 0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    // Opened directly with no email to verify
    if (!email) return <Navigate to="/login" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (code.length !== 6) return setError("Enter the 6-digit code from your email.");
        setError("");
        setInfo("");
        setLoading(true);
        try {
            const res = await axios.post("/api/users/verify-email", { email, code });
            localStorage.setItem("token", res.data.token);
            axios.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
            setUser(res.data);
            navigate(from || ROLE_HOME[res.data.role] || "/", { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || "Verification failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setInfo("");
        setResending(true);
        try {
            await axios.post("/api/users/resend-verification", { email });
            setInfo("A new code is on its way. Check your inbox (and spam folder).");
            setCooldown(RESEND_SECONDS);
        } catch (err) {
            setError(err.response?.data?.message || "Couldn't resend the code. Please try again.");
            if (err.response?.data?.retryAfter) setCooldown(err.response.data.retryAfter);
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="px-6 pt-6 sm:px-10">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-yellow-700/89 duration-100"
                >
                    <ArrowLeft size={15} />
                    Back to login
                </Link>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 py-10">
                <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-10 w-full max-w-md text-center">
                    <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                        <MailCheck size={24} className="text-yellow-600/89" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-800">Verify your email</h1>
                    <p className="text-sm text-zinc-600 mt-2 mb-6">
                        We sent a 6-digit code to <span className="font-medium text-neutral-800 break-all">{email}</span>.
                        Enter it below to continue.
                    </p>

                    {error && (
                        <p role="alert" className="text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2 mb-4 text-sm text-left">
                            {error}
                        </p>
                    )}
                    {info && !error && (
                        <p role="status" className="text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4 text-sm text-left">
                            {info}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <input
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                                if (error) setError("");
                            }}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoFocus
                            placeholder="000000"
                            aria-label="Verification code"
                            className="w-full p-3 text-center text-2xl font-mono tracking-[0.5em] border border-gray-200 rounded-md bg-white text-neutral-800 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-yellow-500/89 focus:border-yellow-600/89"
                        />
                        <button
                            type="submit"
                            disabled={loading || code.length !== 6}
                            className="w-full flex items-center justify-center gap-2 text-white bg-yellow-600/89 border border-yellow-600/89 rounded-md font-medium text-base px-5 py-3 hover:bg-white hover:text-yellow-600/89 duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-yellow-600/89 disabled:hover:text-white"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            {loading ? "Verifying…" : "Verify email"}
                        </button>
                    </form>

                    <p className="text-sm text-gray-500 mt-6">
                        Didn&apos;t get it?{" "}
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending || cooldown > 0}
                            className="font-semibold text-yellow-700/89 hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                        >
                            {resending ? "Sending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}