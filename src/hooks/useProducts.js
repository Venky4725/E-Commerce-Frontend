import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

// Fetch all products
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      console.log("📦 Fetching products...");
      const res = await api.get("/products/?skip=0&limit=100");
      console.log("✅ Raw API response:", res.data);
      
      // Backend returns: { items: [...], total: 6, page: 1, size: 20 }
      // Extract the items array
      let products = [];
      
      if (res.data.items && Array.isArray(res.data.items)) {
        products = res.data.items;
        console.log(`📊 Products from 'items' field: ${products.length}`);
      } else if (Array.isArray(res.data)) {
        products = res.data;
        console.log(`📊 Products from direct array: ${products.length}`);
      } else {
        console.warn("⚠️ Unexpected response format:", res.data);
      }
      
      console.log(`✅ Total products to display: ${products.length}`);
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
      console.log(`📦 Fetching product ${id}...`);
      const res = await api.get(`/products/${id}`);
      console.log("✅ Product response:", res.data);
      return res.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
