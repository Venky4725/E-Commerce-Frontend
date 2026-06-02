import axios from "axios";
import { API_URL } from "./endpoints";
import useAuthStore from "../store/authStore";
import { extractErrorMessage } from "../lib/errorUtils";

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000,
});

let refreshPromise = null;
let toastHandler = null;

export const setApiToastHandler = (handler) => {
  toastHandler = handler;
};

const showGlobalError = (error) => {
  if (!toastHandler || error.config?.silent) return;

  const status = error.response?.status;

  // Handle 401 separately (usually handled by interceptor or login page)
  if (status === 401) return;

  if (!status || status >= 500) {
    toastHandler({
      title: "Connection problem",
      description: "We are still trying to reach the server. Please try again.",
      variant: "destructive",
    });
  } else if (status >= 400 && status < 500) {
    toastHandler({
      title: "Request error",
      description: extractErrorMessage(error, "We could not complete that request. Please try again."),
      variant: "destructive",
    });
  }
};

const getStoredToken = () => {
  const stateToken = useAuthStore.getState().token;
  const storageToken = localStorage.getItem("access_token");
  if (!stateToken && storageToken) {
    const refreshToken = localStorage.getItem("refresh_token");
    useAuthStore.getState().updateToken(storageToken, refreshToken);
    return storageToken;
  }
  return stateToken || storageToken;
};

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const url = originalRequest.url || "";

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.skipAuthRefresh &&
      !url.includes("/login") &&
      !url.includes("/register")
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken =
          useAuthStore.getState().refreshToken || localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token available.");

        refreshPromise =
          refreshPromise ||
          axios.post(`${API_URL}/refresh`, { refresh_token: refreshToken }, { timeout: 45000 });
        const refreshResponse = await refreshPromise;
        const accessToken =
          refreshResponse.data.access_token ||
          refreshResponse.data.accessToken ||
          refreshResponse.data.token;
        const nextRefreshToken =
          refreshResponse.data.refresh_token ||
          refreshResponse.data.refreshToken ||
          refreshToken;
        if (!accessToken) throw new Error("Refresh response did not include an access token.");
        useAuthStore.getState().updateToken(accessToken, nextRefreshToken);
        refreshPromise = null;
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        useAuthStore.getState().logout("expired");
        if (!window.location.pathname.includes("/login")) {
          window.location.assign("/login?expired=1");
        }
        return Promise.reject(refreshError);
      }
    }

    showGlobalError(error);
    return Promise.reject(error);
  }
);

export default api;
