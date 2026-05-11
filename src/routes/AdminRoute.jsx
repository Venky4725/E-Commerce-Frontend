import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";

/**
 * AdminRoute Component
 * Demonstrates: Protected routes, conditional rendering, React Router
 * Use case: Restrict access to admin-only pages
 * 
 * Checks:
 * 1. User is authenticated (has token)
 * 2. User has admin privileges (is_admin === true OR email === "admin@gmail.com")
 */
const AdminRoute = () => {
  const { token, user } = useAuthStore();

  // Check if user is authenticated
  if (!token) {
    console.log("🚫 AdminRoute: No token, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin
  const isAdmin = user?.is_admin === true || user?.email === "admin@gmail.com";
  
  if (!isAdmin) {
    console.log("🚫 AdminRoute: User is not admin, redirecting to home");
    return <Navigate to="/" replace />;
  }

  console.log("✅ AdminRoute: Access granted");
  return <Outlet />;
};

export default AdminRoute;
