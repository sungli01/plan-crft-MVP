import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://plan-crft-mvp-production.up.railway.app";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("plan_craft_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 (with debounce to prevent redirect storm)
let isRedirecting = false;
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      localStorage.removeItem("plan_craft_token");
      localStorage.removeItem("plan_craft_user");
      if (!window.location.pathname.includes("/login")) {
        isRedirecting = true;
        window.location.href = "/login";
      }
    }
    // Rate limit (429) — don't redirect, just reject
    return Promise.reject(error);
  }
);

export default apiClient;
