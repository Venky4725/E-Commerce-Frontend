import React from "react";
import { Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const token = localStorage.getItem("access_token");
  
  return token ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;