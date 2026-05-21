import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isHydrated: false,
      logoutReason: null,

      setAuth: (token, user, refreshToken = get().refreshToken) => {
        if (token) localStorage.setItem("access_token", token);
        if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
        set({
          token,
          refreshToken: refreshToken ?? null,
          user,
          isHydrated: true,
          logoutReason: null,
        });
      },

      updateToken: (token, refreshToken = get().refreshToken) => {
        if (token) localStorage.setItem("access_token", token);
        if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
        set({ token, refreshToken: refreshToken ?? null, isHydrated: true });
      },

      setUser: (user) => set({ user, isHydrated: true }),

      logout: (reason = "manual") => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({
          token: null,
          refreshToken: null,
          user: null,
          isHydrated: true,
          logoutReason: reason,
        });
      },

      isAdmin: () => {
        const state = get();
        return state.user?.is_admin === true || state.user?.email === "admin@gmail.com";
      },

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          if (state.token) localStorage.setItem("access_token", state.token);
          if (state.refreshToken) localStorage.setItem("refresh_token", state.refreshToken);
        }
      },
    }
  )
);

export default useAuthStore;
