import React, { useState, useEffect } from "react";
import api from "../api/api";
import ProductCard from "../components/ProductCard";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, ArrowUpDown, Loader2, SlidersHorizontal } from "lucide-react";

const PRICE_RANGES = [
  { label: "All Prices", value: "all" },
  { label: "Under ₹100", value: "0-100" },
  { label: "₹100 – ₹1,000", value: "100-1000" },
  { label: "Above ₹1,000", value: "1000+" },
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState("all");
  const [sortOrder, setSortOrder] = useState(""); // "" | "asc" | "desc"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch all products once on mount
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/products/?skip=0&limit=100");
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError("Failed to load products. Make sure the backend is running.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // --- Combined filtering + sorting (all frontend) ---

  // 1. Case-insensitive search
  const afterSearch = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // 2. Price range filter
  const afterPrice = afterSearch.filter((p) => {
    if (priceRange === "0-100") return p.price <= 100;
    if (priceRange === "100-1000") return p.price > 100 && p.price <= 1000;
    if (priceRange === "1000+") return p.price > 1000;
    return true; // "all"
  });

  // 3. Sort by price
  const displayProducts = [...afterPrice].sort((a, b) => {
    if (sortOrder === "asc") return a.price - b.price;
    if (sortOrder === "desc") return b.price - a.price;
    return 0;
  });

  const toggleSort = (order) => {
    setSortOrder((prev) => (prev === order ? "" : order));
  };

  const hasActiveFilters = search || priceRange !== "all" || sortOrder;

  const clearFilters = () => {
    setSearch("");
    setPriceRange("all");
    setSortOrder("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
        <p className="text-gray-500 mt-1">
          {loading ? "Loading..." : `${displayProducts.length} product${displayProducts.length !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">

        {/* Search input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search products"
          />
        </div>

        {/* Price range dropdown */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-gray-400 shrink-0" />
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            aria-label="Filter by price range"
            className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PRICE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-2">
          <ArrowUpDown size={15} className="text-gray-400 shrink-0" />
          <Button
            variant={sortOrder === "asc" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort("asc")}
          >
            Price ↑
          </Button>
          <Button
            variant={sortOrder === "desc" ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort("desc")}
          >
            Price ↓
          </Button>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-800">
            Clear
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-20 text-red-500">{error}</div>
      )}

      {/* Empty state */}
      {!loading && !error && displayProducts.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No products found</p>
          {hasActiveFilters && (
            <p className="text-sm">
              Try adjusting your search or filters.{" "}
              <button onClick={clearFilters} className="text-blue-600 hover:underline">
                Clear all
              </button>
            </p>
          )}
        </div>
      )}

      {/* Product grid */}
      {!loading && !error && displayProducts.length > 0 && (
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
