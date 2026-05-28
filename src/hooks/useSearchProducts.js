import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import api from "../api/api";
import { useDebounce } from "./useDebounce";

const normalize = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const calculateScore = (product, needle) => {
  if (!needle) return 0;
  const name = normalize(product.name);
  const desc = normalize(product.description);
  
  let score = 0;
  // Exact match
  if (name === needle) score += 100;
  // Starts with
  else if (name.startsWith(needle)) score += 50;
  // Includes
  else if (name.includes(needle)) score += 20;
  
  // Description match
  if (desc.includes(needle)) score += 5;
  
  return score;
};

const levenshtein = (a, b) => {
  const source = normalize(a);
  const target = normalize(b);
  if (!source) return target.length;
  if (!target) return source.length;

  const matrix = Array.from({ length: source.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= target.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= target.length; j += 1) {
      matrix[i][j] =
        source[i - 1] === target[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[source.length][target.length];
};

export function useSearchProducts(search) {
  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ["product-search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) {
        const res = await api.get("/products/?skip=0&limit=1000");
        const products = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        console.log("[search-products] catalog count", products.length);
        return products;
      }

      try {
        const res = await api.get("/products/search", {
          params: { q: debouncedSearch, limit: 1000 },
          silent: true,
        });
        const products = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        console.log("[search-products] search count", products.length);
        return products;
      } catch (error) {
        if (![404, 405].includes(error.response?.status)) throw error;
        const res = await api.get("/products/?skip=0&limit=1000");
        const products = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        console.log("[search-products] fallback count", products.length);
        return products;
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const filteredProducts = useMemo(() => {
    const products = query.data ?? [];
    const needle = normalize(debouncedSearch);
    if (!needle) return products;

    return products
      .map(p => ({ ...p, _score: calculateScore(p, needle) }))
      .filter((product) => {
        if (product._score > 0) return true;
        const name = normalize(product.name);
        const description = normalize(product.description);
        return (
          name.includes(needle) ||
          description.includes(needle) ||
          name.split(/\s+/).some((word) => levenshtein(word, needle) <= 2)
        );
      })
      .sort((a, b) => (b._score || 0) - (a._score || 0));
  }, [query.data, debouncedSearch]);

  const suggestions = useMemo(() => {
    const needle = normalize(debouncedSearch);
    if (!needle) return [];
    return filteredProducts
      .slice(0, 5)
      .map((product) => product.name)
      .filter(Boolean);
  }, [filteredProducts, debouncedSearch]);

  return { ...query, data: filteredProducts, suggestions, debouncedSearch };
}
