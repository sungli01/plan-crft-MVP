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

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((p) => {
    if (token) p.resolve(token);
    else p.reject(error);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401이고 refresh 시도 전이면 자동 갱신
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem("plan_craft_refresh_token");

      // refresh token 없으면 로그아웃
      if (!refreshToken) {
        localStorage.removeItem("plan_craft_token");
        localStorage.removeItem("plan_craft_user");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      // 이미 refresh 진행 중이면 큐에 대기
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const newToken = data.accessToken || data.token;
        const newRefresh = data.refreshToken;

        if (newToken) localStorage.setItem("plan_craft_token", newToken);
        if (newRefresh) localStorage.setItem("plan_craft_refresh_token", newRefresh);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("plan_craft_token");
        localStorage.removeItem("plan_craft_refresh_token");
        localStorage.removeItem("plan_craft_user");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
