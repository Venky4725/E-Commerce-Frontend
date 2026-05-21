import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
import useAuthStore from "../store/authStore";

export function useProfile() {
  const { token, user } = useAuthStore();
  
  // Use same query key as useSession in useAuth.js to share cache
  const userId = user?.id || user?.email || "anonymous";

  return useQuery({
    queryKey: ["session", userId], // Match useSession query key
    queryFn: async () => {
      const res = await api.get("/me");
      return res.data;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
