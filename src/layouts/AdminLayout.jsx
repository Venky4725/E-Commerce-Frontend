import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, Package, ClipboardList, Users, Settings } from "lucide-react";
import Navbar from "../components/Navbar";

/**
 * Admin Layout Component with Sidebar
 * Demonstrates: Component composition, conditional rendering, NavLink
 * Use case: Admin dashboard layout with navigation
 */
const AdminLayout = () => {
  const adminNavItems = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/orders", label: "Orders", icon: ClipboardList },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? "bg-blue-600 text-white"
        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      
      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-2">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navLinkClass}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
