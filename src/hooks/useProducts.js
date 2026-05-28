import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

// Fetch all products
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products/?skip=0&limit=1000");

      let products = [];
      if (res.data?.items && Array.isArray(res.data.items)) {
        products = res.data.items;
      } else if (Array.isArray(res.data)) {
        products = res.data;
      } else {
        console.warn("⚠️ Unexpected response format:", res.data);
      }

      console.log("[products] fetched", products.length);
      return products;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    retry: 1, // Only retry once on failure
  });
}

// Fetch single product
export function useProduct(id) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
