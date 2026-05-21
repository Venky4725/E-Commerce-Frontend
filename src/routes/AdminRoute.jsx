import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useAuthStore from "../store/authStore";

const AdminRoute = () => {
  const { token, user, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  const isAdmin = user?.is_admin === true || user?.email === "admin@gmail.com";
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminRoute;
