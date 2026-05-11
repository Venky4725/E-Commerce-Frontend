import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import DebugPanel from "./components/DebugPanel";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProductDetail from "./pages/ProductDetail";
import Profile from "./pages/Profile";
import Cart from "./pages/Cart";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import ProtectedRoute from "./routes/ProtectedRoute";
import useThemeStore from "./store/themeStore";

const App = () => {
  const theme = useThemeStore((s) => s.theme);

  // Apply dark class to <html> for Tailwind dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 transition-colors duration-200">
        <Navbar />
        <main className="pb-8">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />

            {/* Protected — regular user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
            </Route>

            {/* Protected — admin */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
            </Route>
          </Routes>
        </main>
        
        {/* Debug panel - only in development */}
        {import.meta.env.DEV && <DebugPanel />}
      </div>
    </Router>
  );
};

export default App;
