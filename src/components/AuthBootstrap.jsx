import React, { useEffect, memo } from "react";
import { useSession } from "../hooks/useAuth";
import useAuthStore from "../store/authStore";
import useNotificationStore from "../store/notificationStore";

function AuthBootstrap() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  useSession();

  useEffect(() => {
    if (token && user) {
      useNotificationStore.getState().setCurrentUser(user.id || user.email);
    }
    if (!token) {
      useNotificationStore.getState().clearAllNotifications();
    }
  }, [token, user]);

  return null;
}

export default React.memo(AuthBootstrap);
