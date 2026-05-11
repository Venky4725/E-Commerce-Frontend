import { create } from "zustand";
import { persist } from "zustand/middleware";

const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      currentUserId: null, // Track which user owns these notifications

      // Set current user and clear if different user
      setCurrentUser: (userId) => {
        const state = get();
        if (state.currentUserId !== userId) {
          console.log(`🔄 User changed from ${state.currentUserId} to ${userId}, clearing notifications`);
          set({
            notifications: [],
            unreadCount: 0,
            currentUserId: userId,
          });
        } else {
          set({ currentUserId: userId });
        }
      },

      addNotification: (notification) => {
        const state = get();
        
        // Prevent duplicates by checking if notification with same ID already exists
        const exists = state.notifications.some(n => n.id === notification.id);
        if (exists) {
          console.log(`⚠️ Notification ${notification.id} already exists, skipping`);
          return;
        }

        const newNotification = {
          id: notification.id || `${Date.now()}-${Math.random()}`,
          timestamp: notification.timestamp || new Date().toISOString(),
          read: notification.read || false,
          ...notification,
        };
        
        console.log(`✅ Adding notification:`, newNotification.title);
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
          unreadCount: newNotification.read ? state.unreadCount : state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (!notification || notification.read) {
            return state; // No change needed
          }
          
          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      clearNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notification && !notification.read 
              ? Math.max(0, state.unreadCount - 1) 
              : state.unreadCount,
          };
        });
      },

      clearAllNotifications: () => {
        console.log("🧹 Clearing all notifications");
        set({ notifications: [], unreadCount: 0, currentUserId: null });
      },
    }),
    {
      name: "notification-storage",
      // Partition storage by user
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        currentUserId: state.currentUserId,
      }),
    }
  )
);

export default useNotificationStore;
