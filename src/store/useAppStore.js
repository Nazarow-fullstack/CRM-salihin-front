import { create } from 'zustand';
import api from '@/lib/axios';
import { formatFormDisplayName } from '@/lib/formDisplayName';

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
            const normalizeList = (data) => {
                if (Array.isArray(data)) return data;
                if (Array.isArray(data?.results)) return data.results;
                return [];
            };

            const [formsRes, notesRes] = await Promise.all([
                api.get('/forms/'),
                api.get('/form-notes/', { params: { ordering: '-created_at' } }).catch(() => ({ data: [] })),
            ]);

            const forms = normalizeList(formsRes.data);
            const notesList = normalizeList(notesRes?.data);

            const oneDayMs = 24 * 60 * 60 * 1000;
            const sevenDayMs = 7 * oneDayMs;
            const cutoffForms = Date.now() - oneDayMs;
            const cutoffNotes = Date.now() - sevenDayMs;

            const newForms = forms.filter((f) => new Date(f.created_at).getTime() > cutoffForms);

            const formNotifications = newForms.map((f) => ({
                id: `form-${f.id}`,
                kind: 'form',
                formId: f.id,
                title: 'Дархости нав',
                message: `${formatFormDisplayName(f) || f.full_name || 'Номаълум'} — аризаи нав (#${f.id}).`,
                time: new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sortAt: new Date(f.created_at).getTime(),
                read: false,
                type: 'info',
            }));

            const noteNotifications = notesList
                .filter((n) => {
                    if (!n?.created_at) return false;
                    if (new Date(n.created_at).getTime() < cutoffNotes) return false;
                    const fid = typeof n.form === 'object' && n.form != null ? n.form.id : n.form;
                    return fid != null;
                })
                .slice(0, 40)
                .map((n) => {
                    const fid = typeof n.form === 'object' && n.form != null ? n.form.id : n.form;
                    const text = (n.note || '').trim();
                    const preview = text.length > 100 ? `${text.slice(0, 100)}…` : text || 'Шарҳ';
                    return {
                        id: `note-${n.id}`,
                        kind: 'note',
                        formId: fid,
                        title: 'Шарҳи нав',
                        message: preview,
                        time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        sortAt: new Date(n.created_at).getTime(),
                        read: false,
                        type: 'comment',
                    };
                });

            const notifications = [...noteNotifications, ...formNotifications]
                .sort((a, b) => b.sortAt - a.sortAt)
                .slice(0, 50)
                .map(({ sortAt, ...rest }) => rest);

            // Process for Recent Activity (limit to top 4 latest)
            const sortedForms = [...forms].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const recent = sortedForms.slice(0, 4).map(f => ({
                id: f.id,
                user: formatFormDisplayName(f) || f.full_name || 'Anonymous',
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
