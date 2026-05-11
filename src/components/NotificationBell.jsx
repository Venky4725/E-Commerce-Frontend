import React, { useState, useRef, useEffect } from "react";
import { Bell, X, Package, ShoppingBag, AlertCircle, CheckCircle } from "lucide-react";
import useNotificationStore from "../store/notificationStore";
import { Button } from "./ui/button";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotificationStore();

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
      case "order_shipped":
        return <Package size={18} className="text-blue-500" />;
      case "order_delivered":
        return <CheckCircle size={18} className="text-green-500" />;
      case "order_cancelled":
        return <AlertCircle size={18} className="text-red-500" />;
      case "product_unavailable":
        return <ShoppingBag size={18} className="text-orange-500" />;
      default:
        return <Bell size={18} className="text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
            {notifications.length > 0 && (
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
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors cursor-pointer ${
                      !notification.read ? "bg-blue-50 dark:bg-blue-900/10" : ""
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
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
                        className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
