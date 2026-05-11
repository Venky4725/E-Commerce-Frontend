import React, { useState, useMemo, useCallback } from "react";
import { useProducts } from "../hooks/useProducts";
import { useDebounce } from "../hooks/useDebounce";
import { useCart } from "../hooks/useCart";
import { useToast } from "../components/ui/toast";
import ProductGrid from "../components/ProductGrid";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, ArrowUpDown, SlidersHorizontal, RefreshCw, X } from "lucide-react";

/**
 * Enhanced Home Page Component
 * Demonstrates: ALL React concepts for syllabus coverage
 * 
 * Concepts covered:
 * 1. Functional components
 * 2. useState, useMemo, useCallback hooks
 * 3. Custom hooks (useDebounce, useCart, useProducts)
 * 4. React Query (via useProducts)
 * 5. Conditional rendering
 * 6. .map() rendering
 * 7. Event handling
 * 8. Performance optimization (useMemo, useCallback)
 * 9. Responsive design
 * 10. Component composition
 */

const PRICE_RANGES = [
  { label: "All Prices", value: "all" },
  { label: "Under ₹100", value: "0-100" },
  { label: "₹100 – ₹1,000", value: "100-1000" },
  { label: "Above ₹1,000", value: "1000+" },
];

const CATEGORIES = [
  { label: "All Categories", value: "all" },
  { label: "Electronics", value: "electronics" },
  { label: "Clothing", value: "clothing" },
  { label: "Books", value: "books" },
  { label: "Home & Kitchen", value: "home" },
];

const Home = () => {
  // ==================== STATE MANAGEMENT ====================
  // Demonstrates: useState hook
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState("all");
  const [category, setCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ==================== CUSTOM HOOKS ====================
  // Demonstrates: Custom hooks, React Query
  const { data: products = [], isLoading, isError, error, refetch } = useProducts();
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  // Demonstrates: useDebounce custom hook for performance
  const debouncedSearch = useDebounce(search, 300);

  // ==================== MEMOIZED FILTERING ====================
  // Demonstrates: useMemo for performance optimization
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Search filter (debounced)
    if (debouncedSearch) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    // 2. Category filter
    if (category !== "all") {
      result = result.filter((p) => 
        p.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // 3. Price range filter
    if (priceRange !== "all") {
      result = result.filter((p) => {
        if (priceRange === "0-100") return p.price <= 100;
        if (priceRange === "100-1000") return p.price > 100 && p.price <= 1000;
        if (priceRange === "1000+") return p.price > 1000;
        return true;
      });
    }

    // 4. Sort
    if (sortOrder === "asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === "desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOrder === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, debouncedSearch, category, priceRange, sortOrder]);

  // ==================== CALLBACK HANDLERS ====================
  // Demonstrates: useCallback for performance optimization
  const handleAddToCart = useCallback(
    (product) => {
      addToCart(product, 1);
      toast({
        title: "Added to cart!",
        description: `${product.name} has been added to your cart.`,
      });
    },
    [addToCart, toast]
  );

  const toggleSort = useCallback((order) => {
    setSortOrder((prev) => (prev === order ? "" : order));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setPriceRange("all");
    setCategory("all");
    setSortOrder("");
  }, []);

  // Check if any filters are active
  const hasActiveFilters = search || priceRange !== "all" || category !== "all" || sortOrder;

  // ==================== RENDER ====================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Discover Amazing Products
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isLoading 
            ? "Loading products..." 
            : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""} available`
          }
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-8">
        {/* Search and Mobile Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-0">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
              aria-label="Search products"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden flex items-center gap-2"
          >
            <SlidersHorizontal size={16} />
            Filters
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="hidden sm:flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        {/* Filters - Desktop Always Visible, Mobile Toggleable */}
        <div className={`${showFilters ? "block" : "hidden"} sm:block mt-4 sm:mt-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price Range
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {PRICE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Default</option>
                <option value="asc">Price: Low to High</option>
                <option value="desc">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
          <p className="text-red-800 dark:text-red-300 font-medium">
            Failed to load products: {error?.message || "Unknown error"}
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="mt-3"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Product Grid */}
      <ProductGrid
        products={filteredProducts}
        onAddToCart={handleAddToCart}
        isLoading={isLoading}
        emptyMessage={
          hasActiveFilters
            ? "No products match your filters"
            : "No products available"
        }
      />
    </div>
  );
};

export default Home;
