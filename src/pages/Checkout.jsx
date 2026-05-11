import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "../api/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { Loader2, ShoppingBag } from "lucide-react";
import { extractErrorMessage, logError } from "../lib/errorUtils";

const checkoutSchema = z.object({
  full_name:    z.string().min(2, "Full name is required"),
  address:      z.string().min(5, "Address is required"),
  city:         z.string().min(2, "City is required"),
  postal_code:  z.string().min(4, "Postal code is required"),
  phone:        z.string().min(7, "Phone number is required"),
});

const Checkout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(checkoutSchema),
  });

  // Load cart + product details
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/cart/me");
        const raw = res.data?.cart_items ?? [];
        const enriched = await Promise.all(
          raw.map(async (item) => {
            try {
              const p = await api.get(`/products/${item.product_id}`);
              return { ...item, product: p.data };
            } catch {
              return { ...item, product: null };
            }
          })
        );
        setCartItems(enriched);
      } catch {
        toast({ title: "Failed to load cart", variant: "destructive" });
      } finally {
        setLoadingCart(false);
      }
    };
    load();
  }, []);

  const total = cartItems.reduce(
    (sum, item) => sum + (item.product?.price ?? 0) * (item.quantity ?? 1),
    0
  );

  const onSubmit = async (data) => {
    if (cartItems.length === 0) {
      toast({ title: "Your cart is empty", variant: "destructive" });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Build order payload
      const payload = {
        shipping_address: `${data.full_name}, ${data.address}, ${data.city} - ${data.postal_code}`,
        phone: data.phone,
      };
      
      // 🐛 DEBUG: Log payload before sending
      console.log("📦 ORDER PAYLOAD:", JSON.stringify(payload, null, 2));
      
      // Send order request
      const response = await api.post("/orders/", payload);
      
      // 🐛 DEBUG: Log success response
      console.log("✅ ORDER SUCCESS:", response.data);
      
      toast({ 
        title: "Order placed!", 
        description: "Thank you for your purchase." 
      });
      
      navigate("/orders");
      
    } catch (err) {
      // 🐛 DEBUG: Log full error with context
      logError("ORDER CREATION", err);
      
      // Extract safe error message
      const errorMessage = extractErrorMessage(err, "Failed to place order. Please try again.");
      
      toast({
        title: "Order failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCart) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
        <ShoppingBag size={24} /> Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Shipping form */}
        <div>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Shipping Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {[
                  { id: "full_name",   label: "Full Name",    placeholder: "John Doe",       type: "text" },
                  { id: "address",     label: "Address",      placeholder: "123 Main Street", type: "text" },
                  { id: "city",        label: "City",         placeholder: "Mumbai",          type: "text" },
                  { id: "postal_code", label: "Postal Code",  placeholder: "400001",          type: "text" },
                  { id: "phone",       label: "Phone Number", placeholder: "+91 9876543210",  type: "tel"  },
                ].map(({ id, label, placeholder, type }) => (
                  <div key={id}>
                    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {label}
                    </label>
                    <Input
                      id={id}
                      type={type}
                      placeholder={placeholder}
                      aria-invalid={!!errors[id]}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      {...register(id)}
                    />
                    {errors[id] && (
                      <p className="mt-1 text-xs text-red-500" role="alert">{errors[id].message}</p>
                    )}
                  </div>
                ))}

                <Button type="submit" className="w-full mt-2" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Placing order...
                    </span>
                  ) : (
                    `Place Order — ₹${total.toFixed(2)}`
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Order summary */}
        <div>
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {cartItems.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Your cart is empty.</p>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const name  = item.product?.name  ?? `Product #${item.product_id}`;
                    const price = item.product?.price ?? 0;
                    const qty   = item.quantity ?? 1;
                    const img   = item.product?.image_url
                      ? `http://127.0.0.1:8000${item.product.image_url}`
                      : null;

                    return (
                      <div key={item.product_id} className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded bg-gray-100 dark:bg-gray-700 shrink-0 overflow-hidden">
                          {img
                            ? <img src={img} alt={name} className="h-full w-full object-contain" />
                            : <div className="h-full w-full bg-gray-200 dark:bg-gray-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {qty}</p>
                        </div>
                        <p className="text-sm font-semibold text-blue-600 shrink-0">
                          ₹{(price * qty).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}

                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3 flex justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-blue-600 text-lg">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
