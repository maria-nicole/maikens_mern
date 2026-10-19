import { Navigate, useSearchParams } from "react-router-dom";

/**
 * The old standalone pages now live inside My Account, but their URLs are kept
 * so bookmarks and older links still land on the right section.
 */

export function MyCartRedirect() {
  return <Navigate to="/profile?tab=cart" replace />;
}

export function FavoritesRedirect() {
  const [searchParams] = useSearchParams();
  // /favorites?tab=custom used to open the designs tab
  const to = searchParams.get("tab") === "custom" ? "/profile?tab=designs" : "/profile?tab=favorites";
  return <Navigate to={to} replace />;
}
