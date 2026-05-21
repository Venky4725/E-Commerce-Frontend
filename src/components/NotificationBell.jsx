import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bell, CheckCircle, Clock, Loader2, Package, RefreshCw, ShoppingBag, Truck, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useNotificationStore from "../store/notificationStore";
import useAuthStore from "../store/authStore";
import api from "../api/api";
import { Button } from "./ui/button";

const iconMap = {
  order_processing: <Clock size={18} className="text-blue-500" />,
  order_shipped: <Truck size={18} className="text-purple-500" />,
  order_delivered: <CheckCircle size={18} className="text-green-500" />,
  order_cancelled: <AlertCircle size={18} className="text-red-500" />,
  product_unavailable: <ShoppingBag size={18} className="text-orange-500" />,
};

const unreadStyles = {
  order_processing: "bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500",
  order_shipped: "bg-purple-50 dark:bg-purple-900/10 border-l-4 border-purple-500",
  order_delivered: "bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500",
  order_cancelled: "bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500",
  product_unavailable: "bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500",
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const NotificationItem = React.memo(function NotificationItem({ notification, onRead, onClear, isMarking }) {
  return (
    <div
      className={`cursor-pointer px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/30 ${
        notification.read ? "" : unreadStyles[notification.type] || "bg-gray-50 dark:bg-gray-900/10 border-l-4 border-gray-500"
      } ${isMarking ? "opacity-60 pointer-events-none" : ""}`}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 shrink-0">{iconMap[notification.type] || <Package size={18} className="text-gray-500" />}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium ${notification.read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}>
              {notification.title}
            </p>
            {isMarking && <Loader2 size={10} className="animate-spin text-gray-400" />}
          </div>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{notification.message}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{formatTimestamp(notification.timestamp)}</p>
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onClear(notification.id);
          }}
          className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Clear notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
});

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    addNotification,
    setCurrentUser,
  } = useNotificationStore();

  const ownerId = user?.id || user?.email;

  useEffect(() => {
    if (ownerId) setCurrentUser(ownerId);
  }, [ownerId, setCurrentUser]);

  const query = useQuery({
    queryKey: ["notifications", ownerId],
    queryFn: async () => {
      try {
        const res = await api.get("/notifications/my", { silent: true });
        return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      } catch (err) {
        if ([404, 405].includes(err.response?.status)) return [];
        throw err;
      }
    },
    enabled: Boolean(ownerId) && !user?.is_admin,
    staleTime: 15000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Sync mutations
  const markAllReadMutation = useMutation({
    mutationFn: () => api.post("/notifications/mark-all-read"),
    onSuccess: () => {
      markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ["notifications", ownerId] });
    },
    onError: (err) => {
      // Fallback for demo/missing endpoint
      if (err.response?.status === 404 || err.response?.status === 405) {
        markAllAsRead();
      }
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: (_, id) => {
      markAsRead(id);
      queryClient.invalidateQueries({ queryKey: ["notifications", ownerId] });
    },
    onError: (err, id) => {
      // Fallback for demo/missing endpoint
      if (err.response?.status === 404 || err.response?.status === 405) {
        markAsRead(id);
      }
    }
  });

  useEffect(() => {
    if (!query.data || !ownerId) return;
    query.data.forEach((notification) => {
      addNotification({
        id: notification.id || notification.notification_id,
        userId: notification.user_id || notification.userId || ownerId,
        type: notification.type || "order_processing",
        title: notification.title || "Order update",
        message: notification.message || "Your order has been updated.",
        timestamp: notification.created_at || notification.timestamp,
        read: notification.read || false,
        orderId: notification.order_id || notification.orderId,
      });
    });
  }, [addNotification, ownerId, query.data]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const refreshNotifications = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications", ownerId] });
    await query.refetch();
  }, [ownerId, query, queryClient]);

  const visibleNotifications = useMemo(() => notifications.slice(0, 50), [notifications]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 flex max-h-[32rem] w-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={refreshNotifications} disabled={query.isFetching} className="h-8 px-2">
                <RefreshCw size={14} className={query.isFetching ? "animate-spin" : ""} />
              </Button>
              {visibleNotifications.length > 0 && unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => markAllReadMutation.mutate()} 
                  disabled={markAllReadMutation.isPending}
                  className="text-xs text-blue-600 dark:text-blue-400"
                >
                  {markAllReadMutation.isPending ? "Marking..." : "Mark all read"}
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {query.isLoading ? (
              <div className="py-12 text-center">
                <Loader2 size={32} className="mx-auto mb-3 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Order updates will appear here instantly.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {visibleNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={(id) => markReadMutation.mutate(id)}
                    onClear={clearNotification}
                    isMarking={markReadMutation.variables === notification.id && markReadMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(NotificationBell);
