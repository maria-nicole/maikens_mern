import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Catalog from "./pages/Catalog";
import Contact from "./pages/Contact";
import PaymentPolicy from "./pages/PaymentPolicy";
import Product from "./pages/Product";
import Profile from "./pages/customer_profile/Profile";
import { FavoritesRedirect, MyCartRedirect } from "./components/account/AccountRedirects";
import Message from "./pages/Message";
import Customize from "./pages/Customize";
import Admin from "./pages/admin/Admin";
import ProductForm from "./pages/admin/ProductForm";
import Staff from "./pages/staff/Staff";
import { useEffect, useState } from "react";
import axios from "axios";
import NotFound from "./components/NotFound";
import Forbidden from "./components/Forbidden";
import RoleGate from "./components/RoleGate";

import VerifyEmail from "./pages/VerifyEmail";


const ROLE_HOME = { admin: "/admin", staff: "/staff", customer: "/" };
const HIDDEN_NAVBAR_PATHS = ["/login", "/register", "/verify-email", "/admin", "/staff"];
// Who may open the staff console. The owner keeps full access to everything.
const STAFF_ROLES = ["staff", "admin"];

function Layout({ user, setUser }) {
  const location = useLocation();
  const hideNavbar = HIDDEN_NAVBAR_PATHS.some((path) =>
    location.pathname.startsWith(path)
  );

  return (

    <>

      {!hideNavbar && <Navbar user={user} setUser={setUser} />}
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/catalog" element={<Catalog user={user} />} />
        <Route path="/mycart" element={<MyCartRedirect />} />
        <Route path="/profile" element={<Profile setUser={setUser} />} />
        <Route path="/favorites" element={<FavoritesRedirect />} />
        <Route path="/contact" element={<Contact user={user} />} />
        <Route path="/payment-policy" element={<PaymentPolicy />} />
        <Route path="/product/:id" element={<Product user={user} />} />
        <Route path="/message" element={<Message user={user} />} />
        <Route path="/customize" element={<Customize user={user} />} />

        <Route
          path="/admin"
          element={
            <RoleGate user={user} roles={["admin"]}>
              <Admin setUser={setUser} />
            </RoleGate>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <RoleGate user={user} roles={["admin"]}>
              <ProductForm to="/productform" />
            </RoleGate>
          }
        />
        <Route
          path="/admin/products/:id/edit"
          element={
            <RoleGate user={user} roles={["admin"]}>
              <ProductForm to="/productform" />
            </RoleGate>
          }
        />

        <Route
          path="/staff"
          element={
            <RoleGate user={user} roles={STAFF_ROLES}>
              <Staff setUser={setUser} />
            </RoleGate>
          }
        />

        <Route path="/403" element={<Forbidden />} />
        <Route
          path="/login"
          element={user ? <Navigate to={ROLE_HOME[user.role] || "/"} /> : <Login setUser={setUser} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={ROLE_HOME[user.role] || "/"} /> : <Register setUser={setUser} />}
        />
        <Route
          path="/verify-email"
          element={user ? <Navigate to={ROLE_HOME[user.role] || "/"} /> : <VerifyEmail setUser={setUser} />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>

  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await axios.get("/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(res.data);
        } catch (err) {
          console.error(err.response?.data?.message || "Failed to fetch user data");
          // only clear the login if the server actually rejected the token,
          // not when the backend is merely offline
          if (err.response?.status === 401) localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center" />;
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <Router>
        <Layout user={user} setUser={setUser} />
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;