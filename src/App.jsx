import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "./components/Navbar";
import NotificationToast from "./components/NotificationToast";
import ApiToastBridge from "./components/ApiToastBridge";
import AuthBootstrap from "./components/AuthBootstrap";
import AIChat from "./components/AIChat";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import useThemeStore from "./store/themeStore";
import { WebSocketProvider } from "./websocket/WebSocketProvider";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Cart = lazy(() => import("./pages/Cart"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));


const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 size={32} className="animate-spin text-blue-500" />
  </div>
);

const ThemeInitializer = () => {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return null;
};

const App = () => {
  return (
    <Router>
      <WebSocketProvider>
        <ThemeInitializer />
        <ApiToastBridge />
        <AuthBootstrap />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-theme">
          <Navbar />
          <main className="pb-8">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/orders" element={<Orders />} />
                </Route>

                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/support" element={<AdminSupport />} />
                </Route>
              </Routes>
            </Suspense>
          </main>
          <AIChat />
          <NotificationToast />
        </div>
      </WebSocketProvider>
    </Router>
  );
};

export default App;
