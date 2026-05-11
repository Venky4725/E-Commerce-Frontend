import React, { Suspense, lazy } from "react";
import ProductCardSkeleton from "./ProductCardSkeleton";

/**
 * ProductGrid Component
 * Demonstrates: Component composition, .map() rendering, responsive grid, lazy loading
 * Use case: Display products in responsive grid layout
 * 
 * Responsive breakpoints:
 * - Mobile: 1 column
 * - Tablet: 2 columns
 * - Desktop: 3-4 columns
 */

// Lazy load ProductCard for code splitting demonstration
const ProductCard = lazy(() => import("./ProductCard"));

const ProductGrid = ({ products, onAddToCart, isLoading = false, emptyMessage = "No products found" }) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-400 dark:text-gray-600 mb-4">
          <svg
            className="mx-auto h-24 w-24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {emptyMessage}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Try adjusting your filters or search terms
        </p>
      </div>
    );
  }

  // Product grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <Suspense key={product.id} fallback={<ProductCardSkeleton />}>
          <ProductCard
            product={product}
            onAddToCart={onAddToCart}
            showActions={true}
          />
        </Suspense>
      ))}
    </div>
  );
};

export default ProductGrid;
