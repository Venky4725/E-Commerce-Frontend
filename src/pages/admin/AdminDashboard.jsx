import React, { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Package, ClipboardList, LayoutDashboard, TrendingUp, DollarSign, ShoppingBag, Users, Loader2, CheckCircle, Clock, Truck, AlertCircle, RefreshCw, MessageCircle } from "lucide-react";

// Format currency in Indian Rupee style
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  
  // Try to fetch from /admin/stats endpoint first, fallback to manual calculation
  const { data: statsData, isLoading: loadingStats, isFetching: fetchingStats, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      try {
        const res = await api.get("/admin/stats");
        return res.data;
      } catch (err) {
        throw err;
      }
    },
    staleTime: 0, // Always fetch fresh stats
    refetchOnWindowFocus: false,
    retry: 0, // Don't retry if endpoint doesn't exist
  });

  // Fetch products for manual calculation
  const { data: products = [], isLoading: loadingProducts, isFetching: fetchingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["admin-products-count"],
    queryFn: async () => {
      const res = await api.get("/products/?skip=0&limit=1000");
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    staleTime: 0, // Always fetch fresh
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: statsError || !statsData, // Only fetch if stats API failed
  });

  // Fetch orders for manual calculation
  const { data: orders = [], isLoading: loadingOrders, isFetching: fetchingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/all");
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    staleTime: 0, // Always fetch fresh
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: statsError || !statsData, // Only fetch if stats API failed
  });

  // Fetch users for manual calculation
  const { data: usersData = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users-count"],
    queryFn: async () => {
      const res = await api.get("/admin/users");
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: statsError || !statsData,
  });

  // Calculate analytics manually if API not available
  const stats = useMemo(() => statsData || {
    total_revenue: orders
      .filter(o => o.status?.toLowerCase() === "delivered")
      .reduce((sum, order) => {
        let orderTotal = order.total_amount ?? order.total_price ?? order.total ?? 0;
        if (orderTotal === 0) {
          const items = order.order_items ?? order.items ?? [];
          orderTotal = items.reduce((itemSum, item) => {
            const price = item.product?.price ?? item.price ?? 0;
            const qty = item.quantity ?? 1;
            return itemSum + (price * qty);
          }, 0);
        }
        return sum + orderTotal;
      }, 0),
    total_orders: orders.length,
    total_products: products.length,
    total_users: usersData.length,
    delivered_orders: orders.filter(o => o.status?.toLowerCase() === "delivered").length,
    pending_orders: orders.filter(o => o.status?.toLowerCase() === "pending").length,
    processing_orders: orders.filter(o => o.status?.toLowerCase() === "processing").length,
    shipped_orders: orders.filter(o => o.status?.toLowerCase() === "shipped").length,
    cancelled_orders: orders.filter(o => o.status?.toLowerCase() === "cancelled").length,
    low_stock_products: products.filter(p => (p.stock_quantity ?? 0) < 10).length,
  }, [orders, products, usersData, statsData]);

  const isLoading = loadingStats || loadingProducts || loadingOrders || loadingUsers;
  const isRefreshing = fetchingStats || fetchingProducts || fetchingOrders;

  const handleRefresh = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-count"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    await Promise.allSettled([refetchStats(), refetchOrders(), refetchProducts(), refetchUsers()]);
  }, [queryClient, refetchOrders, refetchProducts, refetchStats, refetchUsers]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard size={32} className="text-blue-500" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Manage your e-commerce store</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          className="flex items-center gap-2"
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      {/* Analytics Cards - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Revenue - Only from DELIVERED orders */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
              <DollarSign size={18} className="text-green-600 dark:text-green-500" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 size={24} className="animate-spin text-green-500" />
            ) : (
              <>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(stats.total_revenue || 0)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <CheckCircle size={12} />
                  From {stats.delivered_orders || 0} delivered orders
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <ShoppingBag size={18} className="text-blue-600 dark:text-blue-500" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 size={24} className="animate-spin text-blue-500" />
            ) : (
              <>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.total_orders || 0}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1">
                  <Clock size={12} />
                  {stats.pending_orders || 0} pending
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
              <Package size={18} className="text-purple-600 dark:text-purple-500" />
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 size={24} className="animate-spin text-purple-500" />
            ) : (
              <>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {stats.total_products || 0}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {stats.low_stock_products || 0} low stock
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delivered Orders */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-500" />
              Delivered Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            ) : (
              <>
                <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {stats.delivered_orders || 0}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  Successfully completed
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown - Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {/* Pending */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Loader2 size={20} className="animate-spin text-gray-400 mx-auto" />
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock size={16} className="text-yellow-500" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.pending_orders || 0}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Pending</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Processing */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Loader2 size={20} className="animate-spin text-gray-400 mx-auto" />
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-blue-500" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.processing_orders || 0}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Processing</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Shipped */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Loader2 size={20} className="animate-spin text-gray-400 mx-auto" />
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Truck size={16} className="text-purple-500" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.shipped_orders || 0}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Shipped</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Cancelled */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Loader2 size={20} className="animate-spin text-gray-400 mx-auto" />
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertCircle size={16} className="text-red-500" />
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.cancelled_orders || 0}
                  </p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Cancelled</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-xl text-gray-900 dark:text-white mb-1">Product Management</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create, edit, and delete products. Upload images and manage inventory.
              </p>
            </div>
            <Link to="/admin/products">
              <Button size="lg" className="mt-2">Manage Products</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ClipboardList size={32} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-xl text-gray-900 dark:text-white mb-1">Order Management</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View all orders, update statuses, and manage customer orders.
              </p>
            </div>
            <Link to="/admin/orders">
              <Button size="lg" variant="outline" className="mt-2">Manage Orders</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users size={32} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-xl text-gray-900 dark:text-white mb-1">User Management</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Review customers, admins, and account access.
              </p>
            </div>
            <Link to="/admin/users">
              <Button size="lg" variant="outline" className="mt-2">Manage Users</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <CardContent className="flex flex-col items-center py-12 gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center">
              <MessageCircle size={32} className="text-slate-700 dark:text-slate-300" />
            </div>
            <div className="text-center">
              <p className="font-bold text-xl text-gray-900 dark:text-white mb-1">Support Center</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Realtime live chat with active customers.
              </p>
            </div>
            <Link to="/admin/support">
              <Button size="lg" className="mt-2">Open Live Chat</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default React.memo(AdminDashboard);
