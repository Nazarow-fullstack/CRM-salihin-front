import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/axios';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null, // Access token
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (username, password) => {
                console.log("Attempting login with:", username);
                set({ isLoading: true, error: null });

                try {
                    const response = await api.post('/auth/login/', { username, password });

                    console.log("Login Success Data:", response.data);

                    const { access, refresh, user } = response.data;

                    // Save strict keys to localStorage as requested
                    localStorage.setItem('access', access);
                    localStorage.setItem('refresh', refresh);
                    localStorage.setItem('user', JSON.stringify(user));

                    set({
                        user: user,
                        token: access,
                        refreshToken: refresh,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });

                    return true;
                } catch (err) {
                    console.error("LOGIN ERROR FULL OBJECT:", err);
                    console.error("Response Data:", err.response?.data);
                    console.error("Response Status:", err.response?.status);

                    let errorMessage = err.response?.data?.detail || "Ошибка входа";

                    if (err.response) {
                        if (err.response.status === 401) {
                            errorMessage = "Неверное имя пользователя или пароль";
                        } else if (err.response.status === 404) {
                            errorMessage = "Сервер авторизации не найден (404)";
                        } else if (err.response.status === 500) {
                            errorMessage = "Ошибка сервера (500)";
                        }
                    }

                    set({
                        error: errorMessage,
                        isLoading: false,
                        isAuthenticated: false
                    });

                    return false;
                }
            },

            logout: () => {
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                localStorage.removeItem('user');
                set({ user: null, token: null, refreshToken: null, isAuthenticated: false, error: null });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated
            }),
        }
    )
);

export default useAuthStore;
