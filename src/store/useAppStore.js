import { create } from 'zustand';
import api from '@/lib/axios';

const useAppStore = create((set, get) => ({
    onlineUsers: [],
    notifications: [],
    recentActivity: [],

    setNotifications: (notifications) => set({ notifications }),

    // Polling mechanism
    pollingIntervalId: null,

    fetchOnlineUsers: async () => {
        try {
            // Assuming endpoint is /users/online/ or similar
            const response = await api.get('/online-users');
            set({ onlineUsers: response.data });
        } catch (error) {
            console.error("Failed to fetch online users", error);
        }
    },

    fetchNotifications: async () => {
        try {
            const response = await api.get('/forms/');
            const forms = response.data;

            // Process for Notifications (e.g., new forms in last 24h)
            // This is a basic implementation. In a real app, you might want to fetch a dedicated notifications endpoint.
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const newForms = forms.filter(f => new Date(f.created_at) > oneDayAgo);

            const notifications = newForms.map(f => ({
                id: f.id,
                title: 'New Application',
                message: `${f.full_name || 'Anonymous'} submitted a new application (ID: ${f.id}).`,
                time: new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: false,
                type: 'info'
            }));

            // Process for Recent Activity (limit to top 4 latest)
            const sortedForms = [...forms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const recent = sortedForms.slice(0, 4).map(f => ({
                id: f.id,
                user: f.full_name || 'Anonymous',
                action: `Submitted Application #${f.id}`,
                time: (() => {
                    const date = new Date(f.created_at);
                    const now = new Date();
                    const diffInSeconds = Math.floor((now - date) / 1000);

                    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
                    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
                    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
                    return `${Math.floor(diffInSeconds / 86400)}d ago`;
                })()
            }));

            set({ notifications, recentActivity: recent });

        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    },

    initPolling: () => {
        // Prevent multiple intervals
        if (get().pollingIntervalId) return;

        // Initial fetch
        get().fetchOnlineUsers();
        get().fetchNotifications();

        const intervalId = setInterval(() => {
            get().fetchOnlineUsers();
            get().fetchNotifications();
        }, 60000); // 60 seconds

        set({ pollingIntervalId: intervalId });
    },

    stopPolling: () => {
        const { pollingIntervalId } = get();
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            set({ pollingIntervalId: null });
        }
    }
}));

export default useAppStore;
