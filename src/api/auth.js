import api from "./api";
import useAuthStore from "../store/authStore";

const normalizeAuthResponse = (data) => ({
  accessToken: data.access_token || data.accessToken || data.token,
  refreshToken: data.refresh_token || data.refreshToken || data.refresh,
});

export const authApi = {
  async login({ username, password }) {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const res = await api.post("/login", formData.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      skipAuthRefresh: true,
    });

    const { accessToken, refreshToken } = normalizeAuthResponse(res.data);
    if (!accessToken) throw new Error("Login response did not include an access token.");

    useAuthStore.getState().updateToken(accessToken, refreshToken);
    const profile = await api.get("/me");
    useAuthStore.getState().setAuth(accessToken, profile.data, refreshToken);
    return { token: accessToken, refreshToken, user: profile.data };
  },

  async register(payload) {
    const res = await api.post("/register", payload, { skipAuthRefresh: true });
    return res.data;
  },

  async refreshToken() {
    const refreshToken =
      useAuthStore.getState().refreshToken || localStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("No refresh token available.");

    const res = await api.post(
      "/refresh",
      { refresh_token: refreshToken },
      { skipAuthRefresh: true, silent: true }
    );
    const normalized = normalizeAuthResponse(res.data);
    const nextAccessToken = normalized.accessToken;
    const nextRefreshToken = normalized.refreshToken || refreshToken;
    if (!nextAccessToken) throw new Error("Refresh response did not include an access token.");
    useAuthStore.getState().updateToken(nextAccessToken, nextRefreshToken);
    return { accessToken: nextAccessToken, refreshToken: nextRefreshToken };
  },

  async me() {
    const res = await api.get("/me");
    useAuthStore.getState().setUser(res.data);
    return res.data;
  },
};
