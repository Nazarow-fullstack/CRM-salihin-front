import axios from 'axios';
import { getCachedData, setCachedData, clearCache } from '../utils/apiCache';

const API_URL = 'https://khatbar.tj/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to request
api.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access') : null;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// --- API Functions ---

export const getForms = async (params = {}) => {
    const cacheKey = '/forms/';
    const cachedData = getCachedData(cacheKey, params);
    if (cachedData) {
        return { data: cachedData };
    }

    const response = await api.get('/forms/', { params });

    setCachedData(cacheKey, params, response.data);
    return response;
};

export const getForm = (id) => api.get(`/forms/${id}/`);

export const createForm = async (data) => {
    clearCache('/forms/');
    return api.post('/forms/', data);
};

export const updateForm = (id, data) => api.patch(`/forms/${id}/`, data);

export const deleteForm = (id) => api.delete(`/forms/${id}/`);

export const createPayment = (data) => {
    clearCache('/forms/'); // Invalidate query list
    return api.post('/payments/', data);
};

export const getStats = () => api.get('/stats/');

// New user logic provided
export const getPendingForms = () => {
    return api.get('/forms/', { params: { status: 'under_review' } });
};

// User Management
export const getUsers = () => api.get('/users/');
export const createUser = (data) => api.post('/users/', data);
export const updateUser = (id, data) => api.patch(`/users/${id}/`, data);
export const deleteUser = (id) => api.delete(`/users/${id}/`);

export const changePassword = (data) => api.post('/change-password/', data);

// Profile Management
export const getProfile = () => api.get('/profile/');
export const updateProfile = (data) => api.put('/profile/', data);

export const getOnlineUsers = () => api.get('/online-users/');

// Dashboard Stats
export const getDashboardStats = () => api.get('/dashboard-stats/');

// User Activity Stats
export const getUserActivityStats = (params = {}) => api.get('/history/user-activity-stats/', { params });

export default api;
