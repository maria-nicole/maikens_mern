import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_URL, asArray, announceCart, authHeader, EMPTY_CART, isLoggedIn } from "./accountShared";

/**
 * One loader for everything the My Account page shows: profile, orders, custom
 * designs, favorites and the cart.
 *
 * The five requests go out together (Promise.allSettled), so one broken list never
 * stops the rest and the page has a single loading state instead of three.
 * Used to be spread over Profile.jsx, Favorites.jsx and MyCart.jsx.
 */
export default function useAccountData({ setUser } = {}) {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);
  // Only "loading" when there is a token to load with (a signed-out visitor sees the gate)
  const [loading, setLoading] = useState(isLoggedIn);

  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");

  const [orders, setOrders] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState(EMPTY_CART);
  const [activityLoading, setActivityLoading] = useState(isLoggedIn);
  const [activityError, setActivityError] = useState("");

  const [busyId, setBusyId] = useState(null); // the cart line being changed
  const [toast, setToast] = useState("");

  const notify = useCallback((text) => setToast(text || ""), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // The token was rejected (expired / signed out elsewhere): drop it and show the gate
  const expireSession = useCallback(() => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
    setUser?.(null);
    setLoggedIn(false);
  }, [setUser]);

  useEffect(() => {
    if (!loggedIn) return;
    let ignore = false;

    (async () => {
      const headers = authHeader();
      const results = await Promise.allSettled([
        axios.get(`${API_URL}/api/users/profile`, { headers }),
        axios.get(`${API_URL}/api/orders/mine`, { headers }),
        axios.get(`${API_URL}/api/customizations/mine`, { headers }),
        axios.get(`${API_URL}/api/favorites`, { headers }),
        axios.get(`${API_URL}/api/cart`, { headers }),
      ]);
      if (ignore) return;

      if (results.some((r) => r.status === "rejected" && r.reason?.response?.status === 401)) {
        expireSession();
        return;
      }

      const [profileRes, ordersRes, designsRes, favsRes, cartRes] = results;

      if (profileRes.status === "fulfilled") setProfile(profileRes.value.data);
      else setProfileError("We couldn't load your profile. Please try again.");

      if (ordersRes.status === "fulfilled") setOrders(asArray(ordersRes.value.data));
      if (designsRes.status === "fulfilled") setDesigns(asArray(designsRes.value.data));
      if (favsRes.status === "fulfilled") setFavorites(asArray(favsRes.value.data));
      if (cartRes.status === "fulfilled") {
        setCart(cartRes.value.data || EMPTY_CART);
        announceCart(cartRes.value.data);
      }

      if (results.some((r) => r.status === "rejected")) {
        setActivityError("Some of your activity couldn't be loaded. Please refresh to try again.");
      }

      setLoading(false);
      setActivityLoading(false);
    })();

    return () => {
      ignore = true;
    };
  }, [loggedIn, expireSession]);

  // ── Refreshers used after an action ──
  const reloadOrders = useCallback(async () => {
    const { data } = await axios.get(`${API_URL}/api/orders/mine`, { headers: authHeader() });
    setOrders(asArray(data));
  }, []);

  const reloadFavorites = useCallback(async () => {
    const { data } = await axios.get(`${API_URL}/api/favorites`, { headers: authHeader() });
    setFavorites(asArray(data));
  }, []);

  const reloadCart = useCallback(async () => {
    const { data } = await axios.get(`${API_URL}/api/cart`, { headers: authHeader() });
    setCart(data || EMPTY_CART);
    announceCart(data);
    return data;
  }, []);

  // ── Profile ──
  const saveProfile = useCallback(
    async (body) => {
      const res = await axios.put(`${API_URL}/api/users/profile`, body, {
        headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
      });
      const updated = res.data.user || res.data;
      setProfile((prev) => ({ ...prev, ...updated }));
      setUser?.((prev) => ({ ...(prev || {}), ...updated }));
      return updated;
    },
    [setUser]
  );

  // ── Favorites ──
  const removeFavorite = useCallback(
    async (product) => {
      setFavorites((prev) => prev.filter((f) => f._id !== product._id)); // hide right away, refetch if it fails
      try {
        await axios.delete(`${API_URL}/api/favorites/${product._id}`, { headers: authHeader() });
      } catch (err) {
        notify(err.response?.data?.message || "Couldn't remove that favorite. Please try again.");
        reloadFavorites().catch(() => {});
      }
    },
    [notify, reloadFavorites]
  );

  // ── Custom designs ──
  const removeDesign = useCallback(
    async (design) => {
      try {
        await axios.delete(`${API_URL}/api/customizations/${design._id}`, { headers: authHeader() });
        setDesigns((prev) => prev.filter((d) => d._id !== design._id));
        return true;
      } catch (err) {
        notify(err.response?.data?.message || "Couldn't delete that design. Please try again.");
        return false;
      }
    },
    [notify]
  );

  // ── Cart lines ──
  const changeQty = useCallback(
    async (item, delta) => {
      const next = Math.min(Math.max(1, item.quantity + delta), Math.max(1, item.maxQty));
      if (next === item.quantity) return;
      setBusyId(item._id);
      try {
        const { data } = await axios.patch(`${API_URL}/api/cart/${item._id}`, { quantity: next }, { headers: authHeader() });
        setCart(data);
        announceCart(data);
      } catch (err) {
        notify(err.response?.data?.message || "Couldn't update the quantity.");
      } finally {
        setBusyId(null);
      }
    },
    [notify]
  );

  const removeItem = useCallback(
    async (item) => {
      setBusyId(item._id);
      try {
        const { data } = await axios.delete(`${API_URL}/api/cart/${item._id}`, { headers: authHeader() });
        setCart(data);
        announceCart(data);
      } catch (err) {
        notify(err.response?.data?.message || "Couldn't remove that item.");
      } finally {
        setBusyId(null);
      }
    },
    [notify]
  );

  return {
    loggedIn,
    loading,
    profile,
    profileError,
    orders,
    designs,
    favorites,
    cart,
    setCart,
    activityLoading,
    activityError,
    busyId,
    toast,
    notify,
    saveProfile,
    removeFavorite,
    removeDesign,
    changeQty,
    removeItem,
    reloadOrders,
    reloadFavorites,
    reloadCart,
    expireSession,
  };
}
