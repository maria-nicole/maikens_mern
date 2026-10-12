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
import Product from "./pages/Product";
import MyCart from "./pages/customer_profile/MyCart";
import Profile from "./pages/customer_profile/Profile";
import Favorites from "./pages/customer_profile/Favorites";
import Message from "./pages/Message";
import Customize from "./pages/Customize";
import Test from "./pages/Test";
import Admin from "./pages/admin/Admin";
import ProductForm from "./pages/admin/ProductForm";
import Staff from "./pages/staff/Staff";
import { useEffect, useState } from "react";
import axios from "axios";
import NotFound from "./components/NotFound";

import VerifyEmail from "./pages/VerifyEmail";


const ROLE_HOME = { admin: "/admin", staff: "/staff", customer: "/" };
const HIDDEN_NAVBAR_PATHS = ["/login", "/register", "/verify-email", "/admin", "/staff"];

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
        <Route path="/mycart" element={<MyCart user={user} />} />
        <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
        <Route path="/favorites" element={<Favorites user={user} />} />
        <Route path="/contact" element={<Contact user={user} />} />
        <Route path="/product/:id" element={<Product user={user} />} />
        <Route path="/message" element={<Message user={user} />} />
        <Route path="/customize" element={<Customize user={user} />} />
        <Route path="/testpage" element={<Test user={user} />} />

        <Route path="/admin" element={<Admin setUser={setUser} />} />
        <Route path="/admin/products/new" element={<ProductForm to="/productform" />} />
        <Route path="/admin/products/:id/edit" element={<ProductForm to="/productform" />} />

        <Route path="/staff" element={<Staff setUser={setUser} />} />
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