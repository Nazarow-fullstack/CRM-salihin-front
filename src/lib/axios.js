import axios from "axios";
import useAuthStore from "@/store/useAuthStore";

const BASE_URL = "https://khatbar.tj/api";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const storageKey = "auth-storage";
            try {
                const storageItem = localStorage.getItem(storageKey);
                if (storageItem) {
                    const parsed = JSON.parse(storageItem);
                    const token = parsed.state?.token;
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                }
            } catch (e) {
                // ignore parse errors
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Refresh mutex — prevent multiple simultaneous refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
};

// Response Interceptor: Handle 401 — try token refresh before logout
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only handle 401, skip if already retried or it's the refresh endpoint itself
        if (
            error.response?.status !== 401 ||
            originalRequest._retry ||
            originalRequest.url?.includes('/auth/token/refresh/')
        ) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            // Queue request until refresh completes
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            }).catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const refreshToken =
                typeof window !== "undefined"
                    ? localStorage.getItem("refresh")
                    : null;

            if (!refreshToken) throw new Error("No refresh token");

            const res = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
                refresh: refreshToken,
            });

            const newAccessToken = res.data.access;

            // Update stored token
            localStorage.setItem("access", newAccessToken);

            const storageKey = "auth-storage";
            try {
                const storageItem = localStorage.getItem(storageKey);
                if (storageItem) {
                    const parsed = JSON.parse(storageItem);
                    if (parsed.state) {
                        parsed.state.token = newAccessToken;
                        localStorage.setItem(storageKey, JSON.stringify(parsed));
                    }
                }
            } catch (_) { /* ignore */ }

            // Update Zustand store
            useAuthStore.setState((state) => ({
                ...state,
                token: newAccessToken,
            }));

            // Retry queued requests
            processQueue(null, newAccessToken);

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);

        } catch (refreshError) {
            // Refresh also failed → logout
            processQueue(refreshError, null);
            useAuthStore.getState().logout();
            if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
                window.location.href = "/login";
            }
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
