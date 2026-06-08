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
                set({ isLoading: true, error: null });

                try {
                    const response = await api.post('/auth/login/', { username, password });

                    const { access, refresh, user } = response.data;

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
                    let errorMessage = err.response?.data?.detail || 'Хатогии воридшавӣ';

                    if (err.response) {
                        if (err.response.status === 401) {
                            errorMessage = 'Номи корбар ё парол нодуруст';
                        } else if (err.response.status === 404) {
                            errorMessage = 'Сервери тасдиқ ёфт нашуд (404)';
                        } else if (err.response.status === 500) {
                            errorMessage = 'Хатогии сервер (500)';
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
