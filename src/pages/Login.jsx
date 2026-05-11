import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "../api/api";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Loader2 } from "lucide-react";
import useAuthStore from "../store/authStore";

// Zod schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const Login = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setServerError("");
    setLoading(true);

    try {
      console.log("🔐 Step 1: Clearing old cache and auth state...");
      
      // Clear React Query cache before login
      queryClient.clear();
      console.log("✅ React Query cache cleared");

      console.log("🔐 Step 2: Attempting login...");

      // FastAPI expects form-urlencoded for /login
      const formData = new URLSearchParams();
      formData.append("username", data.username);
      formData.append("password", data.password);

      const res = await api.post("/login", formData.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      console.log("✅ Step 3: Login response received:", res.data);

      // Extract token
      const token = res.data.access_token;
      if (!token) {
        throw new Error("No access_token in response");
      }

      console.log("🔑 Step 4: Token extracted:", token.substring(0, 20) + "...");

      // CRITICAL: Store token in localStorage BEFORE calling /me
      localStorage.setItem("access_token", token);
      console.log("💾 Step 5: Token stored in localStorage");

      // Also set default header for this session
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("🔧 Step 6: Default Authorization header set");

      // Verify token is in localStorage
      const storedToken = localStorage.getItem("access_token");
      console.log("✅ Step 7: Token verification:", storedToken ? "EXISTS" : "MISSING");

      // NOW fetch user profile (token is available in interceptor)
      console.log("👤 Step 8: Fetching user profile...");
      const profile = await api.get("/me");
      console.log("✅ Step 9: Profile fetched:", profile.data);

      // Store in Zustand
      setAuth(token, profile.data);
      console.log("💾 Step 10: Auth stored in Zustand");

      // Wait a bit for state to sync
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log("🎉 Login complete! Redirecting...");
      navigate("/");
    } catch (err) {
      console.error("❌ Login error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setServerError(err.response?.data?.detail || err.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center dark:text-white">Welcome back</CardTitle>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-1">
            Sign in to your account
          </p>
        </CardHeader>

        <CardContent>
          {serverError && (
            <div
              role="alert"
              className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 text-sm"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                aria-invalid={!!errors.username}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                {...register("username")}
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                aria-invalid={!!errors.password}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
