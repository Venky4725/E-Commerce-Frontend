import React, { useState } from "react";
import { useProducts } from "../hooks/useProducts";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, ArrowUpDown, Loader2, SlidersHorizontal, RefreshCw } from "lucide-react";

const PRICE_RANGES = [
  { label: "All Prices", value: "all" },
  { label: "Under ₹100", value: "0-100" },
  { label: "₹100 – ₹1,000", value: "100-1000" },
  { label: "Above ₹1,000", value: "1000+" },
];

const Home = () => {
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState("all");
  const [sortOrder, setSortOrder] = useState("");

  // React Query — handles loading, error, caching, refetch
  const { data: products = [], isLoading, isError, error, refetch } = useProducts();

  console.log("🏠 Home render - products:", products.length, "loading:", isLoading, "error:", isError);

  // 1. Case-insensitive search
  const afterSearch = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // 2. Price range filter
  const afterPrice = afterSearch.filter((p) => {
    if (priceRange === "0-100") return p.price <= 100;
    if (priceRange === "100-1000") return p.price > 100 && p.price <= 1000;
    if (priceRange === "1000+") return p.price > 1000;
    return true;
  });

  // 3. Sort
  const displayProducts = [...afterPrice].sort((a, b) => {
    if (sortOrder === "asc") return a.price - b.price;
    if (sortOrder === "desc") return b.price - a.price;
    return 0;
  });

  const toggleSort = (order) => setSortOrder((prev) => (prev === order ? "" : order));
  const hasActiveFilters = search || priceRange !== "all" || sortOrder;
  const clearFilters = () => { setSearch(""); setPriceRange("all"); setSortOrder(""); };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Products</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isLoading ? "Loading..." : `${displayProducts.length} product${displayProducts.length !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <Input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-blue-600 dark:focus:ring-blue-500"
            aria-label="Search products"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-gray-500 dark:text-gray-400 shrink-0" />
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            aria-label="Filter by price range"
            className="h-10 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
          >
            {PRICE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown size={15} className="text-gray-400 shrink-0" />
          <Button variant={sortOrder === "asc" ? "default" : "outline"} size="sm" onClick={() => toggleSort("asc")}>Price ↑</Button>
          <Button variant={sortOrder === "desc" ? "default" : "outline"} size="sm" onClick={() => toggleSort("desc")}>Price ↓</Button>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-800 dark:text-gray-400">
            Clear
          </Button>
        )}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">Failed to load products.</p>
          <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2 mx-auto">
            <RefreshCw size={15} /> Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && displayProducts.length === 0 && (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">No products found</p>
          {hasActiveFilters && (
            <p className="text-sm">
              Try adjusting your filters.{" "}
              <button onClick={clearFilters} className="text-blue-600 hover:underline">Clear all</button>
            </p>
          )}
        </div>
      )}

      {/* Product grid */}
      {!isLoading && !isError && displayProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
