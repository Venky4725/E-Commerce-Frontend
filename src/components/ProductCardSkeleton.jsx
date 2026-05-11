import React from "react";

export default function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm animate-pulse">
      {/* Image placeholder */}
      <div className="h-48 w-full rounded-t-xl bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-3">
        {/* Name */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        {/* Price */}
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-2" />
        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        </div>
      </div>
    </div>
  );
}
