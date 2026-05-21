import React, { useEffect, useState, useRef, memo } from "react";
import { X, Package, CheckCircle, AlertCircle, ShoppingBag, Truck } from "lucide-react";
import useNotificationStore from "../store/notificationStore";

const NotificationToast = () => {
  const [toasts, setToasts] = useState([]);
  const shownIdsRef = useRef(new Set());
  const { notifications } = useNotificationStore();

  useEffect(() => {
    if (notifications.length === 0) return;

    const latestNotification = notifications[0];
    if (!latestNotification.id || latestNotification.read) return;

    if (shownIdsRef.current.has(String(latestNotification.id))) return;

    shownIdsRef.current.add(String(latestNotification.id));
    setToasts((prev) => [...prev, latestNotification]);

    const timeoutId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => String(t.id) !== String(latestNotification.id)));
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [notifications]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_processing":
        return <Package size={20} className="text-blue-500" />;
      case "order_shipped":
        return <Truck size={20} className="text-purple-500" />;
      case "order_delivered":
        return <CheckCircle size={20} className="text-green-500" />;
      case "order_cancelled":
        return <AlertCircle size={20} className="text-red-500" />;
      case "product_unavailable":
        return <ShoppingBag size={20} className="text-orange-500" />;
      default:
        return <Package size={20} className="text-gray-500" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "order_processing":
        return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
      case "order_shipped":
        return "border-purple-500 bg-purple-50 dark:bg-purple-900/20";
      case "order_delivered":
        return "border-green-500 bg-green-50 dark:bg-green-900/20";
      case "order_cancelled":
        return "border-red-500 bg-red-50 dark:bg-red-900/20";
      case "product_unavailable":
        return "border-orange-500 bg-orange-50 dark:bg-orange-900/20";
      default:
        return "border-gray-500 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto border-l-4 rounded-lg shadow-lg p-4 animate-slide-in-right ${getNotificationColor(
            toast.type
          )}`}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">{getNotificationIcon(toast.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {toast.title}
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(NotificationToast);
