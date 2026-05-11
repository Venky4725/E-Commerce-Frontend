import React, { useState, useRef, useEffect } from "react";
import { Bell, X, Package, ShoppingBag, AlertCircle, CheckCircle, Truck, Clock, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import useNotificationStore from "../store/notificationStore";
import useAuthStore from "../store/authStore";
import api from "../api/api";
import { Button } from "./ui/button";
import { createDemoNotifications } from "../lib/notificationUtils";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [syncedIds, setSyncedIds] = useState(new Set()); // Track synced notification IDs
  const dropdownRef = useRef(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, addNotification, setCurrentUser } = useNotificationStore();
  const { user } = useAuthStore();

  // Set current user when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      console.log(`👤 Setting current user: ${user.id}`);
      setCurrentUser(user.id);
      // Reset synced IDs when user changes
      setSyncedIds(new Set());
      setDemoLoaded(false);
    }
  }, [user?.id, setCurrentUser]);

  // Try to fetch notifications from backend (if endpoint exists)
  const { data: backendNotifications, isLoading: loadingNotifications, isError: notificationsError } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      try {
        console.log("🔔 Fetching notifications from backend for user:", user?.id);
        const res = await api.get("/notifications/my");
        console.log("✅ Backend notifications:", res.data);
        return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      } catch (err) {
        console.log("⚠️ Backend notifications not available:", err.response?.status);
        // Return empty array if endpoint doesn't exist
        if (err.response?.status === 404 || err.response?.status === 405) {
          return [];
        }
        throw err;
      }
    },
    enabled: !!user && !user.is_admin, // Only fetch for logged-in non-admin users
    staleTime: 1000 * 60, // Cache for 1 minute
    refetchInterval: 1000 * 60, // Refetch every minute
    refetchOnWindowFocus: true,
    retry: 0, // Don't retry if endpoint doesn't exist
  });

  // Sync backend notifications to local store (ONCE per notification)
  useEffect(() => {
    if (backendNotifications && backendNotifications.length > 0 && user?.id) {
      console.log("🔄 Syncing backend notifications to local store");
      
      backendNotifications.forEach((notification) => {
        const notifId = notification.id;
        
        // Only add if not already synced
        if (!syncedIds.has(notifId)) {
          console.log(`📥 Syncing notification ${notifId}`);
          
          addNotification({
            id: notifId,
            type: notification.type || "order_processing",
            title: notification.title || "Order Update",
            message: notification.message || "Your order has been updated",
            timestamp: notification.created_at || notification.timestamp,
            read: notification.read || false,
          });
          
          // Mark as synced
          setSyncedIds(prev => new Set([...prev, notifId]));
        }
      });
    }
  }, [backendNotifications, user?.id, syncedIds, addNotification]);

  // Load demo notifications if backend doesn't provide any and local store is empty
  useEffect(() => {
    if (!loadingNotifications && !demoLoaded && notifications.length === 0 && user && !user.is_admin) {
      // Only load demo if backend returned empty or error
      if (notificationsError || (backendNotifications && backendNotifications.length === 0)) {
        console.log("📦 Loading demo notifications for testing...");
        const demoNotifs = createDemoNotifications();
        demoNotifs.forEach(notif => addNotification(notif));
        setDemoLoaded(true);
      }
    }
  }, [loadingNotifications, demoLoaded, notifications.length, user, notificationsError, backendNotifications, addNotification]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_processing":
        return <Clock size={18} className="text-blue-500" />;
      case "order_shipped":
        return <Truck size={18} className="text-purple-500" />;
      case "order_delivered":
        return <CheckCircle size={18} className="text-green-500" />;
      case "order_cancelled":
        return <AlertCircle size={18} className="text-red-500" />;
      case "product_unavailable":
        return <ShoppingBag size={18} className="text-orange-500" />;
      default:
        return <Package size={18} className="text-gray-500" />;
    }
  };

  const getNotificationBgColor = (type, read) => {
    if (read) return "";
    
    switch (type) {
      case "order_processing":
        return "bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500";
      case "order_shipped":
        return "bg-purple-50 dark:bg-purple-900/10 border-l-4 border-purple-500";
      case "order_delivered":
        return "bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500";
      case "order_cancelled":
        return "bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500";
      case "product_unavailable":
        return "bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500";
      default:
        return "bg-gray-50 dark:bg-gray-900/10 border-l-4 border-gray-500";
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      
      // Validate date
      if (isNaN(date.getTime())) {
        return "Recently";
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffSecs < 10) return "Just now";
      if (diffSecs < 60) return `${diffSecs} sec ago`;
      if (diffMins === 1) return "1 min ago";
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours === 1) return "1 hour ago";
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
      });
    } catch (err) {
      console.error("Error formatting timestamp:", err);
      return "Recently";
    }
  };

  const handleLoadDemoNotifications = () => {
    console.log("📦 Manually loading demo notifications...");
    const demoNotifs = createDemoNotifications();
    demoNotifs.forEach(notif => addNotification(notif));
    setDemoLoaded(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[32rem] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-96">
            {loadingNotifications ? (
              <div className="py-12 text-center">
                <Loader2 size={32} className="mx-auto text-blue-500 animate-spin mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center px-4">
                <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">No notifications yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-4">
                  You'll be notified when your orders are updated
                </p>
                {/* Demo button for testing */}
                {!demoLoaded && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadDemoNotifications}
                    className="flex items-center gap-2 mx-auto text-xs"
                  >
                    <Sparkles size={14} />
                    Load Demo Notifications
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors cursor-pointer ${
                      getNotificationBgColor(notification.type, notification.read)
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          notification.read 
                            ? "text-gray-700 dark:text-gray-300" 
                            : "text-gray-900 dark:text-white"
                        }`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Clear notification"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
