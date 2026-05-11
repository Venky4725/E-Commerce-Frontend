import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Menu, X, Store, Moon, Sun, ClipboardList, LayoutDashboard, Package } from "lucide-react";
import { Button } from "./ui/button";
import useAuthStore from "../store/authStore";
import useThemeStore from "../store/themeStore";
import useNotificationStore from "../store/notificationStore";
import NotificationBell from "./NotificationBell";
import { useQueryClient } from "@tanstack/react-query";

const Navbar = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { clearAllNotifications } = useNotificationStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    console.log("🚪 Logout button clicked");
    
    // 1. Clear notifications for this user
    clearAllNotifications();
    console.log("✅ Notifications cleared");
    
    // 2. Clear React Query cache
    queryClient.clear();
    console.log("✅ React Query cache cleared");
    
    // 3. Clear auth store (also clears localStorage)
    logout();
    console.log("✅ Auth store cleared");
    
    // 4. Navigate to login
    navigate("/login");
    console.log("✅ Navigated to login");
  };

  const navLinkClass = ({ isActive }) =>
    isActive
      ? "text-blue-600 dark:text-blue-400 font-semibold"
      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors";

  // Admin check: backend is_admin field OR fallback email check
  const isAdmin = user?.is_admin === true || user?.email === "admin@gmail.com";

  return (
    <nav className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white">
            <Store size={22} className="text-blue-600 dark:text-blue-400" />
            ShopKart
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-5">
            <NavLink to="/" className={navLinkClass} end>
              Home
            </NavLink>

            {token ? (
              <>
                {isAdmin ? (
                  // Admin navigation
                  <>
                    <NavLink to="/admin" className={navLinkClass} end>
                      <span className="flex items-center gap-1">
                        <LayoutDashboard size={15} /> Dashboard
                      </span>
                    </NavLink>

                    <NavLink to="/admin/products" className={navLinkClass}>
                      <span className="flex items-center gap-1">
                        <Package size={15} /> Products
                      </span>
                    </NavLink>

                    <NavLink to="/admin/orders" className={navLinkClass}>
                      <span className="flex items-center gap-1">
                        <ClipboardList size={15} /> Manage Orders
                      </span>
                    </NavLink>

                    <NavLink to="/profile" className={navLinkClass}>
                      <span className="flex items-center gap-1">
                        <User size={15} />
                        {user?.username || "Profile"}
                      </span>
                    </NavLink>
                  </>
                ) : (
                  // Regular user navigation
                  <>
                    <NavLink to="/cart" className={navLinkClass}>
                      <span className="flex items-center gap-1">
                        <ShoppingCart size={15} /> Cart
                      </span>
                    </NavLink>

                    <NavLink to="/orders" className={navLinkClass}>
                      <span className="flex items-center gap-1">
                        <ClipboardList size={15} /> Orders
                      </span>
                    </NavLink>

                    <NavLink to="/profile" className={navLinkClass}>
                      <span className="flex items-center gap-1">
                        <User size={15} />
                        {user?.username || "Profile"}
                      </span>
                    </NavLink>
                  </>
                )}

                {/* Notification Bell - only for regular users */}
                {!isAdmin && <NotificationBell />}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                >
                  <LogOut size={15} /> Logout
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>Login</NavLink>
                <Link to="/register">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Register</Button>
                </Link>
              </>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-3">
            {token && !isAdmin && <NotificationBell />}
            <button onClick={toggleTheme} aria-label="Toggle theme" className="text-gray-700 dark:text-gray-300 p-2">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-50 dark:bg-gray-800 px-4 pb-4 flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700">
          <NavLink to="/" className={navLinkClass} end onClick={() => setMenuOpen(false)}>Home</NavLink>
          {token ? (
            <>
              {isAdmin ? (
                // Admin mobile navigation
                <>
                  <NavLink to="/admin" className={navLinkClass} end onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
                  <NavLink to="/admin/products" className={navLinkClass} onClick={() => setMenuOpen(false)}>Products</NavLink>
                  <NavLink to="/admin/orders" className={navLinkClass} onClick={() => setMenuOpen(false)}>Manage Orders</NavLink>
                  <NavLink to="/profile" className={navLinkClass} onClick={() => setMenuOpen(false)}>Profile</NavLink>
                </>
              ) : (
                // Regular user mobile navigation
                <>
                  <NavLink to="/cart" className={navLinkClass} onClick={() => setMenuOpen(false)}>Cart</NavLink>
                  <NavLink to="/orders" className={navLinkClass} onClick={() => setMenuOpen(false)}>Orders</NavLink>
                  <NavLink to="/profile" className={navLinkClass} onClick={() => setMenuOpen(false)}>Profile</NavLink>
                </>
              )}
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="text-left text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navLinkClass} onClick={() => setMenuOpen(false)}>Login</NavLink>
              <NavLink to="/register" className={navLinkClass} onClick={() => setMenuOpen(false)}>Register</NavLink>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
