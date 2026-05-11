import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isHydrated: false,

      setAuth: (token, user) => {
        console.log("🔐 setAuth called:", { token: token?.substring(0, 20) + "...", user: user?.username });
        
        // Sync to localStorage for axios interceptor
        localStorage.setItem("access_token", token);
        
        // Update Zustand state
        set({ token, user, isHydrated: true });
        
        console.log("✅ Auth state updated in Zustand");
      },

      logout: () => {
        console.log("🚪 Logout initiated - clearing all auth state");
        
        // Clear localStorage
        localStorage.removeItem("access_token");
        console.log("✅ Cleared localStorage");
        
        // Clear Zustand state
        set({ token: null, user: null, isHydrated: false });
        console.log("✅ Cleared Zustand state");
      },

      // Helper to check if user is admin
      isAdmin: () => {
        const state = get();
        return state.user?.is_admin === true || state.user?.email === "admin@gmail.com";
      },

      // Mark as hydrated after initial load
      setHydrated: () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        console.log("🔄 Auth store rehydrated from localStorage");
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);

export default useAuthStore;
