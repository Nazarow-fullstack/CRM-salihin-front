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
            const response = await api.get('/online-users/');
            set({ onlineUsers: response.data });
        } catch (error) {
        }
    },

    fetchNotifications: async () => {
        try {
            const normalizeList = (data) => {
                if (Array.isArray(data)) return data;
                if (Array.isArray(data?.results)) return data.results;
                return [];
            };

            const relativeActivityTime = (iso) => {
                const date = new Date(iso);
                const now = new Date();
                const diffInSeconds = Math.floor((now - date) / 1000);
                if (diffInSeconds < 60) return `${diffInSeconds} сония пеш`;
                if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} дақиқа пеш`;
                if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} соат пеш`;
                return `${Math.floor(diffInSeconds / 86400)} рӯз пеш`;
            };

            // Як саҳифа — ҳамаи шарҳҳо лозим нест; backend бояд pagination дошта бошад (page / page_size)
            const notesRes = await api
                .get('/form-notes/', {
                    params: {
                        ordering: '-created_at',
                        page: 1,
                        page_size: 50,
                    },
                })
                .catch(() => ({ data: [] }));

            const notesList = normalizeList(notesRes?.data).slice(0, 60);

            const sevenDayMs = 7 * 24 * 60 * 60 * 1000;
            const cutoffNotes = Date.now() - sevenDayMs;

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

            const notifications = noteNotifications
                .sort((a, b) => b.sortAt - a.sortAt)
                .slice(0, 50)
                .map(({ sortAt, ...rest }) => rest);

            const recent = notesList
                .filter((n) => n?.created_at)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 4)
                .map((n) => {
                    const fid = typeof n.form === 'object' && n.form != null ? n.form.id : n.form;
                    const formObj = typeof n.form === 'object' && n.form != null ? n.form : null;
                    const user =
                        (formObj && (formatFormDisplayName(formObj) || formObj.full_name)) ||
                        (fid != null ? `Ариза #${fid}` : 'Шарҳ');
                    const text = (n.note || '').trim();
                    return {
                        id: n.id,
                        user,
                        action: text.length > 120 ? `${text.slice(0, 120)}…` : text || 'Шарҳ',
                        time: relativeActivityTime(n.created_at),
                    };
                });

            set({ notifications, recentActivity: recent });

        } catch (error) {
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
