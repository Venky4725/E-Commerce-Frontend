import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Loader2 } from "lucide-react";
import { useLoginMutation } from "../hooks/useAuth";
import { extractErrorMessage } from "../lib/errorUtils";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const Login = () => {
  const [searchParams] = useSearchParams();
  const loginMutation = useLoginMutation();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setServerError("");
    try {
      await loginMutation.mutateAsync(data);
    } catch (err) {
      setServerError(extractErrorMessage(err, "Login failed. Check your credentials."));
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md dark:border-gray-700 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-center text-2xl dark:text-white">Welcome back</CardTitle>
          <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
            Sign in to your account
          </p>
        </CardHeader>

        <CardContent>
          {serverError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            >
              {serverError}
            </div>
          )}
          {searchParams.get("expired") && !serverError && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
            >
              Your session expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                aria-invalid={!!errors.username}
                className="dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                {...register("username")}
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                aria-invalid={!!errors.password}
                className="dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
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
            <Link to="/register" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
