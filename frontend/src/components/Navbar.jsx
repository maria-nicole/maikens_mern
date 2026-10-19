import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { LogIn, LogOut, Menu, MessageCircle, Package, ShieldCheck, ShoppingBag, User as UserIcon, X } from "lucide-react";
import { API_URL, CART_EVENT, assetUrl, authHeader } from "./account/accountShared";

/**
 * The shop's top bar.
 *
 * The account menu is plain React state (it used to be Flowbite's JS), so it opens
 * and closes predictably: a click outside, Escape or any navigation puts it away.
 * Signed-in customers get a cart button with a live count, and Orders / Cart sit
 * right under My Account instead of being buried in the account page.
 */

const NAV_LINKS = [
  { to: "/", label: "Home", exact: true },
  { to: "/catalog", label: "Catalog", also: ["/product"] },
  { to: "/customize", label: "Customize" },
  { to: "/contact", label: "Contact" },
];

const ROW_CLASS =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-600 transition-colors hover:bg-amber-50 hover:text-amber-800";

/* The number bubble shared by the cart button and the menu rows. */
const CountPill = ({ count }) =>
  count > 0 ? (
    <span className="min-w-[18px] rounded-full bg-rose-100 px-1.5 py-0.5 text-center text-[11px] font-semibold text-amber-700">
      {count}
    </span>
  ) : null;

/* One row of the account menu, used by the avatar dropdown and the mobile list. */
const NavRow = ({ row, onGo }) => {
  const Icon = row.icon;
  return (
    <Link to={row.to} onClick={onGo} className={ROW_CLASS}>
      <Icon size={16} className="shrink-0 text-amber-600" />
      <span className="flex-1 truncate">{row.label}</span>
      <CountPill count={row.count || 0} />
    </Link>
  );
};

/* The customer's own photo when they have one, their first initial otherwise. */
const Avatar = ({ user }) => {
  const src = user?.avatar ? assetUrl(user.avatar) : "";
  if (src) {
    return <img src={src} alt="" className="h-9 w-9 rounded-full border border-amber-200 object-cover" />;
  }
  const initial = (user?.username || user?.email || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold text-white">
      {initial}
    </span>
  );
};

/* How many items sit in the signed-in customer's cart, for the badge.
   It reads the cart once per navigation and again whenever the account page
   announces a change (CART_EVENT), so adding or removing feels instant. */
function useCartCount(signedIn) {
  const [count, setCount] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!signedIn) return;
    let ignore = false;

    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/cart`, { headers: authHeader() });
        if (!ignore) setCount((data?.items || []).length);
      } catch {
        /* the badge is cosmetic — a failed read just leaves the last number up */
      }
    })();

    const onCart = (event) => setCount((event.detail?.items || []).length);
    window.addEventListener(CART_EVENT, onCart);
    return () => {
      ignore = true;
      window.removeEventListener(CART_EVENT, onCart);
    };
  }, [signedIn, pathname]);

  return signedIn ? count : 0;
}

const Navbar = ({ user, error, setUser }) => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const cartCount = useCartCount(!!user);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname + search);
  const menuRef = useRef(null);

  // A navigation — a link, the back button, a redirect — puts both menus away.
  // Adjusting state during render is React's own pattern for "something changed".
  const here = pathname + search;
  if (lastPath !== here) {
    setLastPath(here);
    setMenuOpen(false);
    setMobileOpen(false);
  }

  // Escape and clicks outside the avatar menu close it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [menuOpen]);

  const closeMenus = () => {
    setMenuOpen(false);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
    setUser?.(null);
    closeMenus();
    navigate("/");
  };

  const isActive = (link) =>
    link.exact
      ? pathname === link.to
      : pathname.startsWith(link.to) || (link.also || []).some((path) => pathname.startsWith(path));

  const navLinkClass = (active) =>
    "relative block py-2 px-3 text-sm font-medium rounded transition-colors duration-200 " +
    "after:content-[''] after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-[2px] after:bg-amber-600 after:origin-left after:transition-transform after:duration-300 " +
    (active
      ? "text-amber-800 after:scale-x-100"
      : "text-stone-600 hover:text-amber-700 after:scale-x-0 hover:after:scale-x-100");

  // My Account first, then the two things customers reach for most.
  const accountRows = user
    ? [
        { to: "/profile", icon: UserIcon, label: "My Account" },
        { to: "/profile?tab=orders", icon: Package, label: "Orders" },
        { to: "/profile?tab=cart", icon: ShoppingBag, label: "Cart", count: cartCount },
        { to: "/message", icon: MessageCircle, label: "Message" },
        ...(user.role === "admin" ? [{ to: "/admin", icon: ShieldCheck, label: "Owner dashboard" }] : []),
        ...(user.role === "staff" ? [{ to: "/staff", icon: ShieldCheck, label: "Staff dashboard" }] : []),
      ]
    : [];

  return (
    <nav className="fixed inset-s-0 top-0 z-20 w-full border-b border-yellow-500 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">

        {/* Brand */}
        <Link to="/" onClick={closeMenus} className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" className="h-9 w-9" />
          <span className="whitespace-nowrap font-serif text-2xl font-bold tracking-wide text-stone-800 md:text-[1.7rem]">
            Maikens <span className="text-amber-700">Gown &amp; Barong</span>
          </span>
        </Link>

        {/* Right side: cart, account, and the mobile menu button */}
        <div className="flex items-center gap-1 md:order-2">
          {user && (
            <Link
              to="/profile?tab=cart"
              onClick={closeMenus}
              aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-600 transition-colors hover:bg-amber-50 hover:text-amber-800"
            >
              <ShoppingBag size={21} />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 min-w-[18px] rounded-full bg-amber-600 px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="flex items-center rounded-full p-0.5 ring-2 ring-transparent transition-all duration-200 hover:ring-yellow-400 focus:outline-none focus:ring-4 focus:ring-amber-200"
              >
                <Avatar user={user} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-3 w-60 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-xl"
                >
                  <div className="border-b border-amber-100 bg-stone-50 px-4 py-3">
                    {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
                    <span className="block truncate text-sm font-semibold text-stone-800">{user.username}</span>
                    <span className="block truncate text-xs text-stone-500">{user.email}</span>
                  </div>

                  <div className="p-2">
                    {accountRows.map((row) => (
                      <NavRow key={row.to} row={row} onGo={closeMenus} />
                    ))}
                  </div>

                  <div className="border-t border-amber-100 p-2">
                    <button type="button" onClick={handleLogout} className={ROW_CLASS}>
                      <LogOut size={16} className="shrink-0 text-amber-600" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                onClick={closeMenus}
                className="hidden items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 sm:inline-flex"
              >
                <LogIn size={16} />
                Log in
              </Link>
              <Link
                to="/register"
                onClick={closeMenus}
                className="hidden rounded-full px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-amber-700 sm:inline-block"
              >
                Register
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-controls="navbar-user"
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-amber-50 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-200 md:hidden"
          >
            <span className="sr-only">{mobileOpen ? "Close main menu" : "Open main menu"}</span>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Links: inline from md up, folded into the panel below md */}
        <div
          id="navbar-user"
          className={`${mobileOpen ? "block" : "hidden"} w-full border-t border-amber-100 pt-3 md:order-1 md:block md:w-auto md:border-0 md:pt-0`}
        >
          <ul className="flex flex-col md:flex-row md:items-center md:gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} onClick={closeMenus} className={navLinkClass(isActive(link))}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Small screens only: the same account shortcuts the avatar menu offers */}
          <ul className="mt-3 space-y-1 border-t border-amber-100 pt-3 md:hidden">
            {user ? (
              <>
                {accountRows.map((row) => (
                  <li key={row.to}>
                    <NavRow row={row} onGo={closeMenus} />
                  </li>
                ))}
                <li>
                  <button type="button" onClick={handleLogout} className={ROW_CLASS}>
                    <LogOut size={16} className="shrink-0 text-amber-600" />
                    Sign out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login" onClick={closeMenus} className={ROW_CLASS}>
                    <LogIn size={16} className="shrink-0 text-amber-600" />
                    Log in
                  </Link>
                </li>
                <li>
                  <Link to="/register" onClick={closeMenus} className={ROW_CLASS}>
                    <UserIcon size={16} className="shrink-0 text-amber-600" />
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
