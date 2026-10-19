import { Navigate, useLocation } from "react-router-dom";
import Forbidden from "./Forbidden";

/**
 * Route guard for the owner and staff consoles.
 *
 *   not signed in at all      -> the login page (remembering where they were going)
 *   signed in, wrong role     -> the 403 page
 *   signed in, role allowed   -> the page
 *
 * If there is a token but the user hasn't loaded yet or the backend is unreachable,
 * the page is rendered anyway so the console can show its own "Can't reach the
 * server" screen instead of a misleading 403.
 */
export default function RoleGate({ user, roles, children }) {
  const location = useLocation();

  if (!localStorage.getItem("token")) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && !roles.includes(user.role)) return <Forbidden />;

  return children;
}
