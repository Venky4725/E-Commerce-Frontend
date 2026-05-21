import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Loader2 } from "lucide-react";
import { useRegisterMutation } from "../hooks/useAuth";

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const Register = () => {
  const registerMutation = useRegisterMutation();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setServerError("");
    try {
      await registerMutation.mutateAsync({
        username: data.username,
        email: data.email,
        password: data.password,
      });
    } catch (err) {
      setServerError(err.response?.data?.detail || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md dark:border-gray-700 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-center text-2xl dark:text-white">Create account</CardTitle>
          <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
            Join us today. It is free.
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

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {[
              { id: "username", label: "Username", type: "text", placeholder: "Choose a username" },
              { id: "email", label: "Email", type: "email", placeholder: "you@example.com" },
              { id: "password", label: "Password", type: "password", placeholder: "At least 6 characters" },
              { id: "confirmPassword", label: "Confirm Password", type: "password", placeholder: "Repeat your password" },
            ].map((field) => (
              <div key={field.id}>
                <label htmlFor={field.id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {field.label}
                </label>
                <Input
                  id={field.id}
                  type={field.type}
                  placeholder={field.placeholder}
                  aria-invalid={!!errors[field.id]}
                  className="dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  {...register(field.id)}
                />
                {errors[field.id] && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {errors[field.id].message}
                  </p>
                )}
              </div>
            ))}

            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
