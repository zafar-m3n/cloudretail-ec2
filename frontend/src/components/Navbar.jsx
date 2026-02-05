import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItemCount } = useCart();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinkBase = "px-3 py-1 rounded-md text-sm font-medium tracking-wide hover:bg-gray-100 transition-colors";
  const navLinkActive = "text-blue-600 border-b-2 border-blue-600";
  const navLinkInactive = "text-gray-700";

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo / Brand */}
          <div className="flex items-center gap-2">
            <Icon icon="mdi:cloud-outline" className="h-6 w-6 text-blue-600" />
            <Link to="/products" className="text-lg font-semibold tracking-wide text-gray-800">
              CloudRetail
            </Link>
          </div>

          {/* Middle: Navigation links */}
          <nav className="flex items-center gap-4">
            <NavLink
              to="/products"
              className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : navLinkInactive}`}
            >
              <span className="inline-flex items-center gap-1">
                <Icon icon="mdi:storefront-outline" className="h-4 w-4" />
                Products
              </span>
            </NavLink>

            <NavLink
              to="/cart"
              className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : navLinkInactive}`}
            >
              <span className="inline-flex items-center gap-1">
                <Icon icon="mdi:cart-outline" className="h-4 w-4" />
                Cart
                {cartItemCount > 0 && (
                  <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-semibold text-white">
                    {cartItemCount}
                  </span>
                )}
              </span>
            </NavLink>

            {isAuthenticated && (
              <NavLink
                to="/profile"
                className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : navLinkInactive}`}
              >
                <span className="inline-flex items-center gap-1">
                  <Icon icon="mdi:account-circle-outline" className="h-4 w-4" />
                  Profile
                </span>
              </NavLink>
            )}
          </nav>

          {/* Right: Auth actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Icon icon="mdi:account-outline" className="h-4 w-4 text-gray-500" />
                  <span className="max-w-45 truncate">{user?.fullName || user?.email || "Signed in"}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Icon icon="mdi:logout" className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Icon icon="mdi:login" className="h-4 w-4" />
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <Icon icon="mdi:account-plus-outline" className="h-4 w-4" />
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
