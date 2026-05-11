import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1",
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    // Read from localStorage
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Token attached to", config.url, ":", token.substring(0, 20) + "...");
    } else {
      console.log("⚠️ No token found in localStorage for", config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 — clear auth and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    
    if (error.response?.status === 401) {
      console.log("🚫 401 Unauthorized on", url);
      
      // Skip auto-logout for login/register routes
      if (url.includes("/login") || url.includes("/register")) {
        console.log("⏭️ Skipping auto-logout for auth route");
        return Promise.reject(error);
      }
      
      // Clear auth and redirect
      console.log("🧹 Clearing auth and redirecting to login");
      localStorage.removeItem("access_token");
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
