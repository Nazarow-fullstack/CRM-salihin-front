/**
 * Simple caching utility for API requests using localStorage.
 * Cache entries expire after 5 minutes by default.
 */

const CACHE_PREFIX = 'api_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const getCachedData = (key, params = {}) => {
    try {
        const cacheKey = `${CACHE_PREFIX}${key}${JSON.stringify(params)}`;
        const cachedItem = localStorage.getItem(cacheKey);

        if (!cachedItem) return null;

        const { data, timestamp, ttl } = JSON.parse(cachedItem);
        const now = new Date().getTime();

        if (now - timestamp > ttl) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
};

export const setCachedData = (key, params, data, ttl = DEFAULT_TTL) => {
    try {
        const cacheKey = `${CACHE_PREFIX}${key}${JSON.stringify(params)}`;
        const cacheItem = {
            data,
            timestamp: new Date().getTime(),
            ttl,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (error) {
        console.error('Error writing to cache:', error);
    }
};

export const clearCache = (key) => {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const itemKey = localStorage.key(i);
            if (itemKey && itemKey.startsWith(`${CACHE_PREFIX}${key}`)) {
                keysToRemove.push(itemKey);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};
