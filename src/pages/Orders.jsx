import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ClipboardList, Loader2, RefreshCw, PackageOpen, Package, MapPin, Phone, Calendar, XCircle } from "lucide-react";
import { extractErrorMessage, logError } from "../lib/errorUtils";
import { useToast } from "../components/ui/toast";
import useNotificationStore from "../store/notificationStore";
import OrderTimeline from "../components/OrderTimeline";
import useAuthStore from "../store/authStore";

// Status badge colors
const STATUS_COLORS = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  shipped:    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  delivered:  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const StatusBadge = ({ status }) => {
  const color = STATUS_COLORS[status?.toLowerCase()] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${color}`}>
      {status ?? "unknown"}
    </span>
  );
};

const Orders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState(null);
  
  // Get current user for user-specific query key
  const { user } = useAuthStore();
  const userId = user?.id || user?.email || "anonymous";

  const { data: orders = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["user-orders", userId], // User-specific query key
    queryFn: async () => {
      try {
        // Use /orders/my for user's own orders
        const res = await api.get("/orders/my");
        
        // 🐛 DEBUG: Log response
        console.log("📋 USER ORDERS RESPONSE:", res.data);
        
        // Handle different response formats
        if (Array.isArray(res.data)) {
          return res.data;
        } else if (res.data?.items && Array.isArray(res.data.items)) {
          return res.data.items;
        } else if (res.data?.orders && Array.isArray(res.data.orders)) {
          return res.data.orders;
        }
        
        console.warn("⚠️ Unexpected orders response format:", res.data);
        return [];
      } catch (err) {
        logError("USER ORDERS FETCH", err);
        throw err;
      }
    },
    enabled: !!user, // Only fetch when user is logged in
    staleTime: 0, // Always fetch fresh data
    cacheTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Always refetch on mount
    retry: 1, // Only retry once on failure
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId) => api.put(`/orders/${orderId}`, { status: "cancelled" }),
    onSuccess: () => {
      // Invalidate user-specific orders query
      queryClient.invalidateQueries({ queryKey: ["user-orders", userId] });
      toast({ title: "Order cancelled successfully" });
      setCancellingId(null);
    },
    onError: (err) => {
      const errorMsg = extractErrorMessage(err, "Failed to cancel order");
      toast({ title: "Cancellation failed", description: errorMsg, variant: "destructive" });
      setCancellingId(null);
    },
  });

  const handleCancelOrder = (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setCancellingId(orderId);
    cancelOrderMutation.mutate(orderId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError) {
    // Extract safe error message
    const errorMsg = extractErrorMessage(error, "Failed to load orders.");
    const status = error?.response?.status;
    
    // Determine error type
    let errorTitle = "Failed to load orders";
    let errorDescription = errorMsg;
    
    if (status === 405) {
      errorTitle = "Method Not Allowed";
      errorDescription = "The orders endpoint is not available. Please contact support.";
    } else if (status === 403) {
      errorTitle = "Access Denied";
      errorDescription = "You don't have permission to view orders.";
    } else if (status === 404) {
      errorTitle = "Not Found";
      errorDescription = "Orders endpoint not found. Please contact support.";
    } else if (status === 401) {
      errorTitle = "Unauthorized";
      errorDescription = "Please login to view your orders.";
    }
    
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <XCircle size={32} className="text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{errorTitle}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-1">{errorDescription}</p>
        {status && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Error code: {status}</p>
        )}
        <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2 mx-auto">
          <RefreshCw size={15} /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ClipboardList size={28} className="text-blue-500" /> My Orders
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage your orders</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            console.log("🔄 Refreshing orders...");
            refetch();
          }} 
          className="flex items-center gap-2"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> 
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <PackageOpen size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No orders yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Start shopping to see your orders here.</p>
          <Link to="/">
            <Button className="flex items-center gap-2">
              <Package size={16} /> Browse Products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const items = order.order_items ?? order.items ?? [];
            
            // Try multiple field names for total, with fallback calculation
            let total = order.total_amount ?? order.total_price ?? order.total ?? 0;
            
            // Fallback: Calculate from items if total is 0 or missing
            if (total === 0 && items.length > 0) {
              total = items.reduce((sum, item) => {
                const price = item.product?.price ?? item.price ?? 0;
                const qty = item.quantity ?? 1;
                return sum + (price * qty);
              }, 0);
              console.log(`📊 Calculated total for order #${order.id}:`, total);
            }
            
            const date  = order.created_at
              ? new Date(order.created_at).toLocaleDateString("en-IN", { 
                  day: "numeric", 
                  month: "long", 
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "—";
            const status = order.status?.toLowerCase() ?? "pending";
            const canCancel = status === "pending" || status === "processing";

            return (
              <Card key={order.id} className="dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
                <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg dark:text-white flex items-center gap-2">
                          Order #{order.id}
                        </CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar size={14} /> {date}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <StatusBadge status={status} />
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0,
                          }).format(total)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* Order Timeline */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Order Progress</h4>
                    <OrderTimeline currentStatus={status} />
                  </div>

                  {/* Order Items */}
                  {items.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package size={16} /> Items Ordered
                      </h4>
                      <div className="space-y-3">
                        {items.map((item, idx) => {
                          const name  = item.product?.name  ?? item.product_name  ?? `Product #${item.product_id ?? idx}`;
                          const price = item.product?.price ?? item.price         ?? 0;
                          const qty   = item.quantity ?? 1;
                          const img   = item.product?.image_url
                            ? `http://127.0.0.1:8000${item.product.image_url}`
                            : null;
                          
                          // Check if product is unavailable (deleted or disabled)
                          const isUnavailable = !item.product || item.product?.is_deleted || item.product?.is_disabled;

                          return (
                            <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 relative">
                              {/* Product Image */}
                              <div className="h-16 w-16 rounded-lg bg-white dark:bg-gray-700 shrink-0 overflow-hidden border border-gray-200 dark:border-gray-600 relative">
                                {img ? (
                                  <img 
                                    src={img} 
                                    alt={name} 
                                    className={`h-full w-full object-contain ${isUnavailable ? 'opacity-50 grayscale' : ''}`} 
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Package size={24} className="text-gray-300" />
                                  </div>
                                )}
                                {isUnavailable && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-xs text-white font-semibold">N/A</span>
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${isUnavailable ? 'text-gray-500 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                  {name}
                                </p>
                                {isUnavailable && (
                                  <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                    ⚠️ Product no longer available
                                  </p>
                                )}
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  Quantity: {qty} × ₹{Number(price).toFixed(2)}
                                </p>
                              </div>

                              {/* Item Total */}
                              <div className="text-right shrink-0">
                                <p className={`font-semibold ${isUnavailable ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                  ₹{(price * qty).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Shipping Address */}
                  {order.shipping_address && (
                    <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                        <MapPin size={16} className="text-blue-600" /> Shipping Address
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{order.shipping_address}</p>
                      {order.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <Phone size={14} /> {order.phone}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {canCancel && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="flex items-center gap-2"
                      >
                        {cancellingId === order.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <XCircle size={14} />
                        )}
                        Cancel Order
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
