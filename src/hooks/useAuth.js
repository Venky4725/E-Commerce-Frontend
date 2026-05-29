import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import useAuthStore from "../store/authStore";
import useNotificationStore from "../store/notificationStore";

export function useSession() {
  const { token, user, isHydrated } = useAuthStore();

  const userId = useMemo(() => {
    if (!user) return "anonymous";
    const id = user.id || user.email;
    return id ? `user-${id}` : "anonymous";
  }, [user]);

  return useQuery({
    queryKey: ["session", userId],
    queryFn: authApi.me,
    enabled: isHydrated && Boolean(token),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.login,
    onMutate: () => {
      queryClient.clear();
      useNotificationStore.getState().clearAllNotifications();
      // Clear anonymous chat/cart data to prevent leakage into the new session
      localStorage.removeItem("ai-chat-history-anonymous");
      localStorage.removeItem("chat-history-anonymous");
      localStorage.removeItem("shopping-cart-guest");
    },
    onSuccess: ({ user }) => {
      useNotificationStore.getState().setCurrentUser(user?.id || user?.email);
      queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/");
    },
  });
}

export function useRegisterMutation() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: () => navigate("/login"),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (reason = "manual") => {
    useNotificationStore.getState().clearAllNotifications();
    queryClient.clear();
    // Clear anonymous chat/cart data on logout
    localStorage.removeItem("ai-chat-history-anonymous");
    localStorage.removeItem("chat-history-anonymous");
    localStorage.removeItem("shopping-cart-guest");
    useAuthStore.getState().logout(reason);
    navigate("/login");
  };
}
