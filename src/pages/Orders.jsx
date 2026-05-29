import React, { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, ClipboardList, Download, FileText, Loader2, MapPin, Package, PackageOpen, Phone, RefreshCw, XCircle } from "lucide-react";
import api from "../api/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { extractErrorMessage } from "../lib/errorUtils";
import OrderTimeline from "../components/OrderTimeline";
import useAuthStore from "../store/authStore";
import { useInvoiceTask } from "../hooks/useInvoiceTask";
import LiveChat from "../components/LiveChat";
import { buildAssetUrl } from "../api/endpoints";
import { getOrderItems, getOrderTotal, normalizeOrderList, normalizeStatus, orderMatchesTab, upsertOrder } from "../lib/orderUtils";
import { TaskProgress } from "../components/TaskProgress";

const tabs = [
  { id: "active", label: "Active Orders" },
  { id: "delivered", label: "Delivered Orders" },
  { id: "cancelled", label: "Cancelled Orders" },
];

const statusClasses = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
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
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses[normalized] || "bg-gray-100 text-gray-700"}`}>
      {normalized}
    </span>
  );
});

const InvoiceActions = React.memo(function InvoiceActions({ orderId }) {
  const { start, isStarting, task, downloadInvoice } = useInvoiceTask(orderId);
  const isDone = task?.status === "completed";
  const isWorking = isStarting || (task && !["completed", "failed"].includes(task.status));

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="outline" size="sm" onClick={() => start()} disabled={isStarting || isWorking} className="flex items-center gap-2">
          {isStarting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {isDone ? "Regenerate invoice" : "Generate invoice"}
        </Button>
        
        {isDone && (
          <Button size="sm" onClick={downloadInvoice} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
            <Download size={14} /> Download PDF
          </Button>
        )}
      </div>

      {task && !isDone && (
        <TaskProgress task={task} label="Generating PDF Invoice" />
      )}
    </div>
  );
});

const OrderCard = React.memo(function OrderCard({ order, isCancelling, onCancel, productMap }) {
  const items = getOrderItems(order);
  const total = getOrderTotal(order);
  const status = normalizeStatus(order.status);
  const canCancel = ["pending", "processing"].includes(status);
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
    <Card className="overflow-hidden border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <CardHeader className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
              Order: ORD-{order.created_at ? new Date(order.created_at).getFullYear() : new Date().getFullYear()}-{String(order.id).padStart(4, "0")}
            </CardTitle>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Calendar size={14} /> {date}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <StatusBadge status={status} />
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
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
          <div className="mb-6 space-y-3">
            <h4 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <Package size={16} /> Items
            </h4>
            {items.map((item, index) => {
              const product = item.product || productMap?.[item.product_id] || {};
              const name = product.name ?? item.product_name ?? `Product #${item.product_id ?? index}`;
              const price = Number(product.price ?? item.price ?? 0);
              const quantity = Number(item.quantity ?? 1);
              const image = product.image_url ? buildAssetUrl(product.image_url) : null;
              const unavailable = !product.name && !item.product && !item.product_name;

              return (
                <div key={`${order.id}-${item.product_id || index}`} className="flex items-center gap-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/30">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700">
                    {image ? (
                      <img src={image} alt={name} loading="lazy" className={`h-full w-full object-contain ${unavailable ? "opacity-50 grayscale" : ""}`} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={24} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium ${unavailable ? "text-gray-500 line-through" : "text-gray-900 dark:text-gray-100"}`}>{name}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Quantity: {quantity} x Rs. {price.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-gray-900 dark:text-gray-100">Rs. {(price * quantity).toLocaleString('en-IN')}</p>
                </div>
              );
            })}
          </div>
        )}

        {order.shipping_address && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <MapPin size={16} className="text-blue-600" /> Shipping Address
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{order.shipping_address}</p>
            {order.phone && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <Phone size={14} /> {order.phone}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          {canCancel && (
            <Button variant="destructive" size="sm" onClick={() => onCancel(order.id)} disabled={isCancelling} className="flex items-center gap-2">
              {isCancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Cancel Order
            </Button>
          )}
          <InvoiceActions orderId={order.id} />
        </div>
      </CardContent>
    </Card>
  );
});

const Orders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [cancellingId, setCancellingId] = useState(null);
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || user?.email || "anonymous";
  const queryKey = useMemo(() => ["user-orders", userId], [userId]);

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products-cache-orders"],
    queryFn: async () => {
      const res = await api.get("/products/?skip=0&limit=1000");
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const productMap = useMemo(() => {
    return allProducts.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});
  }, [allProducts]);

  const ordersQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get("/orders/my");
      return normalizeOrderList(res.data);
    },
    enabled: Boolean(user),
    staleTime: 15000,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId) => api.put(`/orders/${orderId}/status`, { status: "cancelled" }),
    onMutate: async (orderId) => {
      setCancellingId(orderId);
      await queryClient.cancelQueries({ queryKey });
      const previousOrders = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (current = []) =>
        upsertOrder(current, { id: orderId, status: "cancelled", updated_at: new Date().toISOString() })
      );
      return { previousOrders };
    },
    onSuccess: () => {
      toast({ title: "Order cancelled successfully" });
    },
    onError: (err, _orderId, context) => {
      queryClient.setQueryData(queryKey, context?.previousOrders || []);
      toast({ title: "Cancellation failed", description: extractErrorMessage(err, "Failed to cancel order"), variant: "destructive" });
    },
    onSettled: () => {
      setCancellingId(null);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    await ordersQuery.refetch();
  }, [ordersQuery, queryClient, queryKey, userId]);

  const handleCancelOrder = useCallback(
    (orderId) => {
      if (!window.confirm("Are you sure you want to cancel this order?")) return;
      cancelOrderMutation.mutate(orderId);
    },
    [cancelOrderMutation]
  );

  const orders = ordersQuery.data ?? [];
  const tabCounts = useMemo(
    () =>
      tabs.reduce((acc, tab) => {
        acc[tab.id] = orders.filter((order) => orderMatchesTab(order, tab.id)).length;
        return acc;
      }, {}),
    [orders]
  );
  const visibleOrders = useMemo(() => orders.filter((order) => orderMatchesTab(order, activeTab)), [activeTab, orders]);

  if (ordersQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <XCircle size={32} className="text-red-500" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Failed to load orders</h3>
        <p className="mb-4 text-gray-600 dark:text-gray-400">{extractErrorMessage(ordersQuery.error, "Failed to load orders.")}</p>
        <Button variant="outline" onClick={handleRefresh} className="mx-auto flex items-center gap-2">
          <RefreshCw size={15} /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900 dark:text-white">
            <ClipboardList size={28} className="text-blue-500" /> My Orders
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Track status changes, invoices, and support chat in one place.</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2" disabled={ordersQuery.isFetching}>
          <RefreshCw size={16} className={ordersQuery.isFetching ? "animate-spin" : ""} />
          {ordersQuery.isFetching ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <PackageOpen size={40} className="text-gray-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">No orders yet</h3>
          <p className="mb-6 text-gray-500 dark:text-gray-400">Start shopping to see your orders here.</p>
          <Link to="/">
            <Button className="flex items-center gap-2">
              <Package size={16} /> Browse Products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <div className="mb-5 flex overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-fit flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab.label} <span className="ml-1 text-xs opacity-80">({tabCounts[tab.id] || 0})</span>
                </button>
              ))}
            </div>

            {visibleOrders.length === 0 ? (
              <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <CardContent className="py-16 text-center text-gray-500 dark:text-gray-400">
                  No {tabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()}.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-5">
                {visibleOrders.map((order) => (
                  <OrderCard key={order.id} order={order} isCancelling={cancellingId === order.id} onCancel={handleCancelOrder} />
                ))}
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LiveChat />
          </aside>
        </div>
      )}
    </div>
  );
};

export default React.memo(Orders);
