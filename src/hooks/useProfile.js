import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import useAuthStore from "../store/authStore";

export function useProfile() {
  const { token, user } = useAuthStore();
  
  // Use user-specific query key to prevent cache collisions
  const userId = user?.id || user?.email || "anonymous";

  return useQuery({
    queryKey: ["profile", userId], // User-specific key
    queryFn: async () => {
      console.log("🔄 Fetching fresh profile for user:", userId);
      const res = await api.get("/me");
      console.log("✅ Profile fetched:", res.data);
      return res.data;
    },
    enabled: !!token, // only fetch when logged in
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
