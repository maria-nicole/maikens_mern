import React, { useEffect } from 'react'
import { initFlowbite } from 'flowbite'
import { Link, useNavigate } from "react-router-dom";
import userPic from '../assets/img_maikens_1/userPic.jpg'

const Navbar = ({ user, error, setUser }) => {
  useEffect(() => {
    initFlowbite()
  }, [])

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  const navLinkClass =
    "relative block py-2 px-3 text-heading font-medium rounded transition-colors duration-200 md:p-0 " +
    "hover:text-amber-700 after:content-[''] after:absolute after:left-3 after:right-3 md:after:left-0 md:after:right-0 " +
    "after:-bottom-1 after:h-[2px] after:bg-amber-600 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300";

  return (
    <nav className="fixed w-full z-20 top-0 inset-s-0 border-b border-yellow-500 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl flex flex-wrap items-center justify-between mx-auto px-4 py-3">

        {/* Brand */}
        <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="self-center text-2xl md:text-3xl font-serif tracking-wide text-heading font-bold whitespace-nowrap">
            Maikens <span className="text-amber-700">Gown & Barong</span>
          </span>
        </Link>

        <div className="flex items-center md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
          <button
            type="button"
            className="flex text-sm rounded-full ring-2 ring-transparent hover:ring-yellow-400 focus:ring-4 focus:ring-stone-300 transition-all duration-200 cursor-pointer"
            id="user-menu-button"
            aria-expanded="false"
            data-dropdown-toggle="user-dropdown"
            data-dropdown-placement="bottom"
          >
            <span className="sr-only">Open user menu</span>
            <img className="w-9 h-9 rounded-full object-cover border border-amber-200" src={userPic} alt="user photo" />
          </button>

          <div
            className="z-50 hidden bg-white border border-yellow-500 rounded-xl shadow-xl w-52 overflow-hidden"
            id="user-dropdown"
          >
            <div className="px-4 py-3 text-sm border-b border-yellow-500 bg-stone-100/60">
              {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}
              {user ? (
                <>
                  <span className="block text-heading font-semibold">{user.username}</span>
                  <span className="block text-body text-xs truncate">{user.email}</span>
                </>
              ) : (
                <span className="block text-body">Not logged in</span>
              )}
            </div>

            <ul className="p-2 text-sm text-body font-medium" aria-labelledby="user-menu-button">
              <li>
                <Link to="/profile" className="block w-full p-2 rounded hover:bg-stone-100 hover:text-amber-800 transition-colors duration-150">
                  Profile
                </Link>
              </li>
              <li>
                <Link to="/mycart" className="block w-full p-2 rounded hover:bg-stone-100 hover:text-amber-800 transition-colors duration-150">
                  My Cart
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="block w-full p-2 rounded hover:bg-stone-100 hover:text-amber-800 transition-colors duration-150">
                  Favorites
                </Link>
              </li>
              <li>
                <Link to="/message" className="block w-full p-2 rounded hover:bg-stone-100 hover:text-amber-800 transition-colors duration-150">
                  Message
                </Link>
              </li>

              {user ? (
                <li className="border-t border-yellow-500 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left p-2 rounded hover:bg-stone-100 hover:text-amber-800 transition-colors duration-150 cursor-pointer"
                  >
                    Sign out
                  </button>
                </li>
              ) : (
                <li className="border-t border-yellow-500 mt-1 pt-1 space-y-1">
                  <Link to="/login" className="block w-full p-2 rounded hover:bg-stone-100 hover:text-amber-800 transition-colors duration-150">
                    Login
                  </Link>
                  <Link to="/register" className="block w-full p-2 rounded hover:bg-stone-100 hover:text-amber-800 transition-colors duration-150">
                    Register
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <button
            data-collapse-toggle="navbar-user"
            type="button"
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-body rounded-lg md:hidden hover:bg-stone-100 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-rose-200 transition-colors duration-150"
            aria-controls="navbar-user"
            aria-expanded="false"
          >
            <span className="sr-only">Open main menu</span>
            <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h14" />
            </svg>
          </button>
        </div>

        <div className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1" id="navbar-user">
          <ul className="font-medium flex flex-col p-4 md:p-0 mt-4 border border-yellow-500 rounded-lg bg-white md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-transparent">
            <li><Link to="/" className={navLinkClass}>Home</Link></li>
            <li><Link to="/catalog" className={navLinkClass}>Catalog</Link></li>
            <li><a href="/customize" className={navLinkClass}>Customize</a></li>
            <li><Link to="/contact" className={navLinkClass}>Contact</Link></li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar