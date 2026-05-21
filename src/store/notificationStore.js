import { create } from "zustand";
import { persist } from "zustand/middleware";

const getOwnerId = (notification) =>
  notification.userId || notification.user_id || notification.recipient_id || notification.ownerId;

const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      currentUserId: null,

      setCurrentUser: (userId) => {
        const nextUserId = userId ? String(userId) : null;
        const state = get();
        if (state.currentUserId !== nextUserId) {
          // Clear notifications when user changes to prevent cross-talk
          set({ notifications: [], unreadCount: 0, currentUserId: nextUserId });
          return;
        }
        set({ currentUserId: nextUserId });
      },

      addNotification: (notification) => {
        if (!notification) return;
        
        const state = get();
        const ownerId = getOwnerId(notification);
        const normalizedOwnerId = ownerId ? String(ownerId) : state.currentUserId;

        // Security check: only add if it belongs to current user
        if (state.currentUserId && normalizedOwnerId && String(normalizedOwnerId) !== String(state.currentUserId)) {
          return;
        }

        const id = String(
          notification.id ||
          notification.notification_id ||
          `${notification.type || "notification"}-${notification.order_id || notification.orderId || ""}-${notification.timestamp || Date.now()}`
        );

        const newNotification = {
          id,
          userId: normalizedOwnerId || state.currentUserId,
          timestamp: notification.created_at || notification.timestamp || new Date().toISOString(),
          read: Boolean(notification.read),
          type: notification.type || "order_processing",
          title: notification.title || "Order update",
          message: notification.message || "Your order status changed.",
          orderId: notification.order_id || notification.orderId,
          ...notification,
        };

        set((current) => {
          // Check for existing notification to avoid duplicates
          const exists = current.notifications.some((n) => String(n.id) === id);
          if (exists) {
            // If it exists, maybe update it if the new one is marked as read
            return {
              notifications: current.notifications.map(n => 
                String(n.id) === id ? { ...n, ...newNotification, read: n.read || newNotification.read } : n
              ),
              unreadCount: current.notifications.filter(n => !n.read).length
            };
          }

          const updatedNotifications = [newNotification, ...current.notifications]
            .filter((item) => !current.currentUserId || String(item.userId) === String(current.currentUserId))
            .sort((a, b) => {
              const timeA = new Date(a.timestamp).getTime() || 0;
              const timeB = new Date(b.timestamp).getTime() || 0;
              return timeB - timeA;
            })
            .slice(0, 50);

          return {
            notifications: updatedNotifications,
            unreadCount: updatedNotifications.filter((item) => !item.read).length,
          };
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find((item) => String(item.id) === String(id));
          if (!notification || notification.read) return state;
          const updated = state.notifications.map((item) =>
            String(item.id) === String(id) ? { ...item, read: true } : item
          );
          return {
            notifications: updated,
            unreadCount: updated.filter(n => !n.read).length,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((item) => ({ ...item, read: true })),
          unreadCount: 0,
        }));
      },

      clearNotification: (id) => {
        set((state) => {
          const updated = state.notifications.filter((item) => String(item.id) !== String(id));
          return {
            notifications: updated,
            unreadCount: updated.filter(n => !n.read).length,
          };
        });
      },

      clearAllNotifications: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: "notification-storage",
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        currentUserId: state.currentUserId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.currentUserId) return;
        // Clean up on rehydration
        state.notifications = (state.notifications || []).filter(
          (item) => String(item.userId) === String(state.currentUserId)
        );
        state.unreadCount = state.notifications.filter((item) => !item.read).length;
      },
    }
  )
);

export default useNotificationStore;
