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

/** DRF pagination: { results, count } — köhnə düz massiv dəstəklənir */
function normalizeFormsListResponse(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
}

export const getForms = async (params = {}) => {
    const cacheKey = '/forms/';
    const cachedData = getCachedData(cacheKey, params);
    if (cachedData) {
        return { data: normalizeFormsListResponse(cachedData) };
    }

    const response = await api.get('/forms/', { params });
    const list = normalizeFormsListResponse(response.data);
    setCachedData(cacheKey, params, list);
    return { ...response, data: list };
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

/**
 * GET /stats/ — ümumi statistika (JWT).
 * Cavabda `accounting` obyekti (əgər backend göndərir): `to_accountant_approved_amount_total`,
 * `approved_approved_amount_total` — mövcud `total_amount` / `paid_amount` davranışı saxlanılır.
 */
export const getStats = () => api.get('/stats/');

/**
 * GET /forms/accounting_stats/ — muhasebe aggregate (JWT).
 * @param {Record<string, string>} [params] — məs: search, ref_date_from, ref_date_to
 * @param {import('axios').AxiosRequestConfig} [axiosConfig] — signal, headers, …
 * @returns {Promise<import('axios').AxiosResponse<{
 *   to_accountant_count?: number,
 *   to_accountant_approved_amount_total?: number,
 *   approved_count?: number,
 *   approved_approved_amount_total?: number
 * }>>}
 */
export const getAccountingStats = (params = {}, axiosConfig = {}) => {
    const config = { ...axiosConfig };
    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
        config.params = params;
    }
    return api.get('/forms/accounting_stats/', config);
};

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
