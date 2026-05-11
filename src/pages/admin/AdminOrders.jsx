import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toast";
import { Loader2, RefreshCw, ClipboardList, Package, User, Calendar, MapPin, Phone, Trash2, Shield, AlertTriangle } from "lucide-react";
import { extractErrorMessage, logError } from "../../lib/errorUtils";
import useNotificationStore from "../../store/notificationStore";
import OrderTimeline from "../../components/OrderTimeline";

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_COLORS = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  shipped:    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-700",
  delivered:  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-700",
};

const StatusBadge = ({ status }) => {
  const color = STATUS_COLORS[status?.toLowerCase()] ?? "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize border ${color}`}>
      {status ?? "unknown"}
    </span>
  );
};

const AdminOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      try {
        const res = await api.get("/orders/all");
        console.log("📋 ADMIN ORDERS RESPONSE:", res.data);
        return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      } catch (err) {
        logError("ADMIN ORDERS FETCH", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => {
      console.log("📝 Updating order status:", { id, status });
      console.log("📝 API endpoint:", `/orders/${id}/status`);
      console.log("📝 Payload:", { status });
      return api.put(`/orders/${id}/status`, { status });
    },
    onSuccess: (data, variables) => {
      console.log("✅ Order status updated:", variables);
      
      // Invalidate admin orders query
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      
      // Invalidate admin stats (for revenue update)
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products-count"] });
      
      toast({ title: "Order status updated successfully" });
      
      // Add notification for user
      const notificationMessages = {
        shipped: { title: "Order Shipped!", message: `Your order #${variables.id} has been shipped and is on its way.`, type: "order_shipped" },
        delivered: { title: "Order Delivered!", message: `Your order #${variables.id} has been delivered successfully.`, type: "order_delivered" },
        cancelled: { title: "Order Cancelled", message: `Your order #${variables.id} has been cancelled.`, type: "order_cancelled" },
      };
      
      const notification = notificationMessages[variables.status];
      if (notification) {
        addNotification(notification);
      }
      
      setUpdatingId(null);
    },
    onError: (err) => {
      console.error("❌ Update order error:", err);
      const errorMsg = extractErrorMessage(err, "Failed to update order");
      toast({ title: "Update failed", description: errorMsg, variant: "destructive" });
      setUpdatingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (orderId) => {
      console.log("🗑️ Deleting order:", orderId);
      console.log("🗑️ DELETE URL:", `/orders/${orderId}`);
      return api.delete(`/orders/${orderId}`);
    },
    onSuccess: (data, orderId) => {
      console.log("✅ Order deleted successfully:", orderId);
      
      // Invalidate all order-related queries
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["user-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      
      toast({ title: "Order deleted successfully" });
      setDeletingId(null);
    },
    onError: (err, orderId) => {
      console.error("❌ Delete order error:", err);
      console.error("❌ Error response:", err.response?.data);
      console.error("❌ Error status:", err.response?.status);
      console.error("❌ Failed order ID:", orderId);
      
      const errorMsg = extractErrorMessage(err, "Failed to delete order");
      toast({ 
        title: "Delete failed", 
        description: errorMsg, 
        variant: "destructive" 
      });
      setDeletingId(null);
    },
  });

  const handleStatusChange = (orderId, newStatus) => {
    setUpdatingId(orderId);
    updateMutation.mutate({ id: orderId, status: newStatus });
  };

  const handleDelete = (orderId, orderStatus) => {
    // Prevent deletion of delivered orders
    if (orderStatus === "delivered") {
      toast({ 
        title: "Cannot delete delivered order", 
        description: "Delivered orders are protected and cannot be deleted. They are part of your revenue records.",
        variant: "destructive" 
      });
      return;
    }

    // Show confirmation dialog with appropriate message
    const confirmMessage = orderStatus === "cancelled" 
      ? "Are you sure you want to delete this cancelled order? This action cannot be undone."
      : "Are you sure you want to delete this order? Consider changing the status to 'Cancelled' instead. This action cannot be undone.";
    
    if (!window.confirm(confirmMessage)) return;
    
    setDeletingId(orderId);
    deleteMutation.mutate(orderId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-red-500 mb-4 font-medium">Failed to load orders.</p>
        <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2 mx-auto">
          <RefreshCw size={15} /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ClipboardList size={28} className="text-blue-600 dark:text-blue-500" /> Order Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage all customer orders</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {ORDER_STATUSES.map((status) => {
          const count = orders.filter(o => o.status?.toLowerCase() === status).length;
          const color = STATUS_COLORS[status];
          return (
            <Card key={status} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{count}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize mt-1">{status}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="py-20 text-center">
            <ClipboardList size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const items  = order.order_items ?? order.items ?? [];
            
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
            
            const date   = order.created_at
              ? new Date(order.created_at).toLocaleDateString("en-IN", { 
                  day: "numeric", 
                  month: "long", 
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "—";
            const status = order.status?.toLowerCase() ?? "pending";
            const customerName = order.user?.username ?? order.user?.email ?? `User #${order.user_id ?? "Unknown"}`;

            return (
              <Card key={order.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                          Order #{order.id}
                        </CardTitle>
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-sm text-gray-700 dark:text-gray-400 flex items-center gap-1">
                            <User size={14} /> {customerName}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Calendar size={14} /> {date}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <StatusBadge status={status} />
                      <div className="text-right">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
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
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <Package size={16} /> Order Items
                      </h4>
                      <div className="space-y-2">
                        {items.map((item, idx) => {
                          const name  = item.product?.name ?? item.product_name ?? `Product #${item.product_id ?? idx}`;
                          const price = item.product?.price ?? item.price ?? 0;
                          const qty   = item.quantity ?? 1;
                          const img   = item.product?.image_url
                            ? `http://127.0.0.1:8000${item.product.image_url}`
                            : null;

                          return (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded bg-gray-100 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800">
                              <div className="h-12 w-12 rounded bg-white dark:bg-gray-700 shrink-0 overflow-hidden border border-gray-300 dark:border-gray-600">
                                {img ? (
                                  <img src={img} alt={name} className="h-full w-full object-contain" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Package size={20} className="text-gray-400 dark:text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {qty} × ₹{Number(price).toFixed(2)}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0">
                                ₹{(price * qty).toFixed(2)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Shipping Info */}
                  {order.shipping_address && (
                    <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                        <MapPin size={16} className="text-blue-600 dark:text-blue-400" /> Shipping Details
                      </h4>
                      <p className="text-sm text-gray-800 dark:text-gray-300">{order.shipping_address}</p>
                      {order.phone && (
                        <p className="text-sm text-gray-700 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <Phone size={14} /> {order.phone}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-sm font-medium text-gray-800 dark:text-gray-300 shrink-0">
                        Update Status:
                      </label>
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={updatingId === order.id || status === "delivered"}
                        className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent flex-1 max-w-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        title={status === "delivered" ? "Delivered orders cannot be changed" : ""}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                      {updatingId === order.id && (
                        <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-500" />
                      )}
                      {status === "delivered" && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400" title="Delivered orders are protected">
                          <Shield size={14} />
                          <span className="hidden sm:inline">Protected</span>
                        </div>
                      )}
                    </div>

                    {/* Delete Button - Disabled for delivered orders */}
                    {status === "delivered" ? (
                      <div className="relative group">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={true}
                          className="flex items-center gap-2 bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50"
                          title="Delivered orders cannot be deleted"
                        >
                          <Shield size={14} />
                          <span className="hidden sm:inline">Protected</span>
                        </Button>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                          <div className="flex items-center gap-2">
                            <Shield size={12} />
                            <span>Delivered orders cannot be deleted</span>
                          </div>
                          <div className="text-gray-300 dark:text-gray-400 mt-1">
                            They are part of your revenue records
                          </div>
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(order.id, status)}
                        disabled={deletingId === order.id}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                        title={status === "cancelled" ? "Delete cancelled order" : "Delete order (consider cancelling instead)"}
                      >
                        {deletingId === order.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            {status === "cancelled" ? (
                              <Trash2 size={14} />
                            ) : (
                              <AlertTriangle size={14} />
                            )}
                          </>
                        )}
                        <span className="hidden sm:inline">
                          {status === "cancelled" ? "Delete" : "Delete Order"}
                        </span>
                        <span className="sm:hidden">Delete</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
