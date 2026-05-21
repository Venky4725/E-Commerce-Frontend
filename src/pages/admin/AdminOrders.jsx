import React, { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Calendar, ClipboardList, Loader2, MapPin, Package, Phone, RefreshCw, Shield, Trash2, User, Mail } from "lucide-react";
import api from "../../api/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toast";
import { extractErrorMessage } from "../../lib/errorUtils";
import OrderTimeline from "../../components/OrderTimeline";
import { buildAssetUrl } from "../../api/endpoints";
import { getOrderItems, getOrderTotal, normalizeOrderList, normalizeStatus, orderMatchesTab, upsertOrder } from "../../lib/orderUtils";

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const tabs = [
  { id: "active", label: "Active Orders" },
  { id: "delivered", label: "Delivered Orders" },
  { id: "cancelled", label: "Cancelled Orders" },
  { id: "deleted", label: "Deleted Orders Archive" },
];

const statusClasses = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-700",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-700",
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const StatusBadge = React.memo(function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClasses[normalized] || "border-gray-300 bg-gray-100 text-gray-700"}`}>
      {normalized}
    </span>
  );
});

const OrderCard = React.memo(function OrderCard({ order, updatingId, deletingId, onStatusChange, onDelete, userMap, productMap }) {
  const items = getOrderItems(order);
  const total = getOrderTotal(order);
  const status = normalizeStatus(order.status);
  const isDeleted = Boolean(order.is_deleted || order.deleted_at || order.archived);
  
  const user = order.user || userMap?.[order.user_id] || {};
  const customerName = user.username ?? user.email ?? `User #${order.user_id ?? "Unknown"}`;
  const date = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  return (
    <Card className="border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <CardHeader className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">Order #{order.id}</CardTitle>
            <div className="mt-2 flex flex-col gap-1">
              <p className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-400">
                <User size={14} /> {customerName}
              </p>
              <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <Calendar size={14} /> {date}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 lg:justify-end">
            <StatusBadge status={status} />
            {isDeleted && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                Archived
              </span>
            )}
            <div className="text-right">
              <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        <div className="mb-6">
          <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">Order Progress</h4>
          <OrderTimeline currentStatus={status} />
        </div>

        {items.length > 0 && (
          <div className="mb-6">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <Package size={16} /> Order Items
            </h4>
            <div className="space-y-2">
              {items.map((item, index) => {
                const product = item.product || productMap?.[item.product_id] || {};
                const name = product.name ?? item.product_name ?? `Product #${item.product_id ?? index}`;
                const price = Number(product.price ?? item.price ?? 0);
                const quantity = Number(item.quantity ?? 1);
                const image = product.image_url ? buildAssetUrl(product.image_url) : null;

                return (
                  <div key={`${order.id}-${item.product_id || index}`} className="flex items-center gap-3 rounded border border-gray-200 bg-gray-100 p-2 dark:border-gray-800 dark:bg-gray-900/30">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
                      {image ? (
                        <img src={image} alt={name} loading="lazy" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package size={20} className="text-gray-400 dark:text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {quantity} x Rs. {price.toFixed(2)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-gray-900 dark:text-gray-100">Rs. {(price * quantity).toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {order.shipping_address && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <MapPin size={16} className="text-blue-600 dark:text-blue-400" /> Shipping Details
            </h4>
            <p className="text-sm text-gray-800 dark:text-gray-300">{order.shipping_address}</p>
            {order.phone && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-700 dark:text-gray-400">
                <Phone size={14} /> {order.phone}
              </p>
            )}
          </div>
        )}

        {!isDeleted && (
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <div className="flex flex-1 items-center gap-2">
              <label className="shrink-0 text-sm font-medium text-gray-800 dark:text-gray-300">Update Status:</label>
              <select
                value={status}
                onChange={(event) => onStatusChange(order.id, event.target.value)}
                disabled={updatingId === order.id || status === "delivered"}
                className="max-w-xs flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                title={status === "delivered" ? "Delivered orders cannot be changed" : ""}
              >
                {ORDER_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
              {updatingId === order.id && <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-500" />}
              {status === "delivered" && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400" title="Delivered orders are protected">
                  <Shield size={14} />
                  <span className="hidden sm:inline">Protected</span>
                </div>
              )}
            </div>

            {status === "delivered" ? (
              <Button variant="destructive" size="sm" disabled className="flex items-center gap-2 bg-gray-400 opacity-50 dark:bg-gray-600">
                <Shield size={14} /> <span className="hidden sm:inline">Protected</span>
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(order.id, status)}
                disabled={deletingId === order.id}
                className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
              >
                {deletingId === order.id ? <Loader2 size={14} className="animate-spin" /> : status === "cancelled" ? <Trash2 size={14} /> : <AlertTriangle size={14} />}
                <span className="hidden sm:inline">{status === "cancelled" ? "Delete" : "Delete Order"}</span>
                <span className="sm:hidden">Delete</span>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const AdminOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data: adminUsers = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get("/admin/users");
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await api.get("/products/?skip=0&limit=1000");
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const userMap = useMemo(() => {
    return adminUsers.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [adminUsers]);

  const productMap = useMemo(() => {
    return allProducts.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});
  }, [allProducts]);

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await api.get("/orders/all");
      return normalizeOrderList(res.data);
    },
    staleTime: 15000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const deletedOrdersQuery = useQuery({
    queryKey: ["admin-orders", "deleted"],
    queryFn: async () => {
      try {
        const res = await api.get("/orders/archive/deleted", { silent: true });
        return normalizeOrderList(res.data).map((order) => ({ ...order, is_deleted: true }));
      } catch (err) {
        if ([404, 405].includes(err.response?.status)) return [];
        throw err;
      }
    },
    staleTime: 30000,
    retry: 0,
  });

  const invalidateOrderData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["user-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products-count"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/orders/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      setUpdatingId(id);
      await queryClient.cancelQueries({ queryKey: ["admin-orders"] });
      const previousOrders = queryClient.getQueryData(["admin-orders"]);
      queryClient.setQueryData(["admin-orders"], (current = []) =>
        upsertOrder(current, { id, status, updated_at: new Date().toISOString() })
      );
      return { previousOrders };
    },
    onSuccess: (_data, variables) => {
      toast({ title: "Order status updated", description: `Order #${variables.id} is now ${variables.status}.` });
    },
    onError: (err, _variables, context) => {
      queryClient.setQueryData(["admin-orders"], context?.previousOrders || []);
      toast({ title: "Update failed", description: extractErrorMessage(err, "Failed to update order"), variant: "destructive" });
    },
    onSettled: () => {
      setUpdatingId(null);
      invalidateOrderData();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (orderId) => api.delete(`/orders/${orderId}`),
    onMutate: async (orderId) => {
      setDeletingId(orderId);
      await queryClient.cancelQueries({ queryKey: ["admin-orders"] });
      const previousOrders = queryClient.getQueryData(["admin-orders"]);
      const deletedOrder = previousOrders?.find((order) => String(order.id) === String(orderId));
      queryClient.setQueryData(["admin-orders"], (current = []) =>
        current.map((order) =>
          String(order.id) === String(orderId)
            ? { ...order, is_deleted: true, deleted_at: new Date().toISOString() }
            : order
        )
      );
      if (deletedOrder) {
        queryClient.setQueryData(["admin-orders", "deleted"], (current = []) =>
          upsertOrder(current, { ...deletedOrder, is_deleted: true, deleted_at: new Date().toISOString() })
        );
      }
      return { previousOrders };
    },
    onSuccess: () => toast({ title: "Order moved to archive" }),
    onError: (err, _orderId, context) => {
      queryClient.setQueryData(["admin-orders"], context?.previousOrders || []);
      toast({ title: "Delete failed", description: extractErrorMessage(err, "Failed to delete order"), variant: "destructive" });
    },
    onSettled: () => {
      setDeletingId(null);
      invalidateOrderData();
    },
  });

  const handleStatusChange = useCallback(
    (orderId, newStatus) => updateMutation.mutate({ id: orderId, status: newStatus }),
    [updateMutation]
  );

  const handleDelete = useCallback(
    (orderId, orderStatus) => {
      if (orderStatus === "delivered") {
        toast({
          title: "Cannot delete delivered order",
          description: "Delivered orders are protected and remain part of revenue records.",
          variant: "destructive",
        });
        return;
      }
      const confirmMessage =
        orderStatus === "cancelled"
          ? "Delete this cancelled order and move it to the archive?"
          : "Delete this order? Consider changing the status to Cancelled instead.";
      if (!window.confirm(confirmMessage)) return;
      deleteMutation.mutate(orderId);
    },
    [deleteMutation, toast]
  );

  const handleRefresh = useCallback(async () => {
    invalidateOrderData();
    await Promise.all([ordersQuery.refetch(), deletedOrdersQuery.refetch()]);
  }, [deletedOrdersQuery, invalidateOrderData, ordersQuery]);

  const liveOrders = ordersQuery.data ?? [];
  const deletedOrders = deletedOrdersQuery.data ?? [];
  const allOrders = useMemo(() => {
    const liveIds = new Set(liveOrders.map((order) => String(order.id)));
    return [...liveOrders, ...deletedOrders.filter((order) => !liveIds.has(String(order.id)))];
  }, [deletedOrders, liveOrders]);

  const tabCounts = useMemo(
    () =>
      tabs.reduce((acc, tab) => {
        const source = tab.id === "deleted" ? [...liveOrders, ...deletedOrders] : liveOrders;
        acc[tab.id] = source.filter((order) => orderMatchesTab(order, tab.id)).length;
        return acc;
      }, {}),
    [deletedOrders, liveOrders]
  );

  const visibleOrders = useMemo(() => {
    const source = activeTab === "deleted" ? allOrders : liveOrders;
    return source.filter((order) => orderMatchesTab(order, activeTab));
  }, [activeTab, allOrders, liveOrders]);

  const isInitialLoading = ordersQuery.isLoading || (activeTab === "deleted" && deletedOrdersQuery.isLoading);
  const isRefreshing = ordersQuery.isFetching || deletedOrdersQuery.isFetching;

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="mb-4 font-medium text-red-500">Failed to load orders.</p>
        <Button variant="outline" onClick={handleRefresh} className="mx-auto flex items-center gap-2">
          <RefreshCw size={15} /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900 dark:text-white">
            <ClipboardList size={28} className="text-blue-600 dark:text-blue-500" /> Order Management
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage live order status, revenue records, and archived orders.</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2 border-gray-300 dark:border-gray-600" disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {ORDER_STATUSES.map((status) => {
          const count = liveOrders.filter((order) => normalizeStatus(order.status) === status && !orderMatchesTab(order, "deleted")).length;
          return (
            <Card key={status} className="border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                <p className="mt-1 text-xs capitalize text-gray-600 dark:text-gray-400">{status}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-5 flex overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-w-fit flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {tab.label} <span className="ml-1 text-xs opacity-80">({tabCounts[tab.id] || 0})</span>
          </button>
        ))}
      </div>

      {visibleOrders.length === 0 ? (
        <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <CardContent className="py-20 text-center">
            <ClipboardList size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-600 dark:text-gray-400">No {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              updatingId={updatingId}
              deletingId={deletingId}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              userMap={userMap}
              productMap={productMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
