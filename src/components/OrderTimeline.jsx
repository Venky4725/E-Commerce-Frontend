import React from "react";
import { Check, Clock, Package, Truck, CheckCircle, XCircle } from "lucide-react";

/**
 * OrderTimeline Component
 * Displays order progress: PENDING → PROCESSING → SHIPPED → DELIVERED
 * Shows cancelled state if order is cancelled
 */

const OrderTimeline = ({ currentStatus }) => {
  const status = currentStatus?.toLowerCase() || "pending";

  // Define order lifecycle stages
  const stages = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "processing", label: "Processing", icon: Package },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle },
  ];

  // Check if order is cancelled
  if (status === "cancelled") {
    return (
      <div className="py-4">
        <div className="flex items-center justify-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <XCircle size={24} className="text-red-600 dark:text-red-400" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-300">Order Cancelled</p>
            <p className="text-sm text-red-700 dark:text-red-400">This order has been cancelled</p>
          </div>
        </div>
      </div>
    );
  }

  // Find current stage index
  const currentIndex = stages.findIndex((s) => s.key === status);

  return (
    <div className="py-6">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10">
          <div
            className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-500"
            style={{
              width: currentIndex >= 0 ? `${(currentIndex / (stages.length - 1)) * 100}%` : "0%",
            }}
          />
        </div>

        {/* Stages */}
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center relative z-10">
              {/* Icon Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                } ${isCurrent ? "ring-4 ring-blue-200 dark:ring-blue-900 scale-110" : ""}`}
              >
                {isCompleted ? <Check size={20} /> : <Icon size={20} />}
              </div>

              {/* Label */}
              <p
                className={`mt-2 text-xs font-medium text-center ${
                  isCompleted
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                } ${isCurrent ? "font-bold" : ""}`}
              >
                {stage.label}
              </p>

              {/* Current indicator */}
              {isCurrent && (
                <div className="mt-1 w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;
