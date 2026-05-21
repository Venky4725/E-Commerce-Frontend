import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, ArrowUpDown, SlidersHorizontal, RefreshCw, X } from "lucide-react";
import { useSearchProducts } from "../hooks/useSearchProducts";
import { HighlightText } from "../components/HighlightText";

const PRICE_RANGES = [
  { label: "All Prices", value: "all" },
  { label: "Under Rs. 100", value: "0-100" },
  { label: "Rs. 100 - Rs. 1,000", value: "100-1000" },
  { label: "Above Rs. 1,000", value: "1000+" },
];

const Home = () => {
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState("all");
  const [sortOrder, setSortOrder] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const searchRef = useRef(null);

  const {
    data: products = [],
    suggestions,
    isLoading,
    isError,
    refetch,
    debouncedSearch,
  } = useSearchProducts(search);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (suggestionIndex >= 0) {
        setSearch(suggestions[suggestionIndex]);
        setShowSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const displayProducts = useMemo(() => {
    const afterPrice = products.filter((product) => {
      if (priceRange === "0-100") return product.price <= 100;
      if (priceRange === "100-1000") return product.price > 100 && product.price <= 1000;
      if (priceRange === "1000+") return product.price > 1000;
      return true;
    });

    return [...afterPrice].sort((a, b) => {
      if (sortOrder === "asc") return a.price - b.price;
      if (sortOrder === "desc") return b.price - a.price;
      return 0;
    });
  }, [products, priceRange, sortOrder]);

  const toggleSort = useCallback((order) => {
    setSortOrder((prev) => (prev === order ? "" : order));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setPriceRange("all");
    setSortOrder("");
    setShowSuggestions(false);
  }, []);

  const hasActiveFilters = search || priceRange !== "all" || sortOrder;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Products</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {isLoading ? "Loading..." : `${displayProducts.length} product${displayProducts.length !== 1 ? "s" : ""} found`}
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1" ref={searchRef}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <Input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setShowSuggestions(true);
              setSuggestionIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            className="border-gray-300 bg-white pl-9 pr-9 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            aria-label="Search products"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setShowSuggestions(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          )}

          {showSuggestions && debouncedSearch && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-11 z-20 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setSearch(suggestion);
                    setShowSuggestions(false);
                  }}
                  onMouseEnter={() => setSuggestionIndex(index)}
                  className={`block w-full rounded px-3 py-2 text-left text-sm transition-colors ${
                    suggestionIndex === index
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <HighlightText text={suggestion} highlight={search} />
                    <Search size={12} className="opacity-30" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="shrink-0 text-gray-500 dark:text-gray-400" />
          <select
            value={priceRange}
            onChange={(event) => setPriceRange(event.target.value)}
            aria-label="Filter by price range"
            className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {PRICE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown size={15} className="shrink-0 text-gray-400" />
          <Button variant={sortOrder === "asc" ? "default" : "outline"} size="sm" onClick={() => toggleSort("asc")}>
            Price up
          </Button>
          <Button variant={sortOrder === "desc" ? "default" : "outline"} size="sm" onClick={() => toggleSort("desc")}>
            Price down
          </Button>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-gray-800 dark:text-gray-400">
            Clear
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="py-20 text-center">
          <p className="mb-4 text-red-500">Failed to load products.</p>
          <Button variant="outline" onClick={() => refetch()} className="mx-auto flex items-center gap-2">
            <RefreshCw size={15} /> Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && displayProducts.length === 0 && (
        <div className="py-20 text-center text-gray-500 dark:text-gray-400">
          <p className="mb-2 text-lg">No products found</p>
          {hasActiveFilters && (
            <p className="text-sm">
              Try adjusting your filters.{" "}
              <button onClick={clearFilters} className="text-blue-600 hover:underline">
                Clear all
              </button>
            </p>
          )}
        </div>
      )}

      {!isLoading && !isError && displayProducts.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} highlight={search} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
