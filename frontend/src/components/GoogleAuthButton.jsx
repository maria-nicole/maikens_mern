import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";
import { useLocation, useNavigate } from "react-router-dom";

const ROLE_HOME = { admin: "/admin", staff: "/staff", customer: "/" };

export default function GoogleAuthButton({ setUser, onError }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleSuccess = async ({ credential }) => {
        try {
            const res = await axios.post("/api/users/google", { credential });
            localStorage.setItem("token", res.data.token);
            axios.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
            setUser(res.data);
            const cameFrom = location.state?.from?.pathname;
            navigate(cameFrom || ROLE_HOME[res.data.role] || "/", { replace: true });
        } catch (err) {
            onError(err.response?.data?.message || "Google sign-in failed. Please try again.");
        }
    };

    return (
        <div className="flex justify-center">
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => onError("Google sign-in was cancelled or failed.")}
                text="continue_with"
                shape="rectangular"
            />
        </div>
    );
}