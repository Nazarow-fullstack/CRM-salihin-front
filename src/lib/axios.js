import axios from "axios";
import useAuthStore from "@/store/useAuthStore";

const api = axios.create({
    baseURL: "http://khatbar.tj/api",
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
                    const token = parsed.state?.token; // Access token
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                }
            } catch (e) {
                console.error("Error reading token from local storage", e);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle 401
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            console.warn("Unauthorized access - logging out");

            // Clear auth state immediately
            useAuthStore.getState().logout();

            if (typeof window !== "undefined") {
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.href = "/login";
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
