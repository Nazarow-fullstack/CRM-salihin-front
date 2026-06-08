'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users,
    UserPlus,
    Search,
    Edit2,
    Trash2,
    Lock,
    Loader2,
    XCircle,
    Activity,
    TrendingUp,
    FileEdit,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    BarChart3,
    List,
    Calendar,
    AlertCircle,
    Award,
    Zap,
    Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getOnlineUsers,
    getUserActivityStats,
} from '@/services/api';

// --- Roles Configuration ---
const ROLES = {
    superuser: { label: 'Супер Админ', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    admin: { label: 'Админ', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    operator: { label: 'Оператор', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    reviewer: { label: 'Кумита', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    accountant: { label: 'Бухгалтер', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
};

// --- Activity Constants ---
const STATUS_LABELS = {
    new_message: 'Паёми нав', submitted: 'Пуркардани анкета', under_review: 'Кумита',
    to_accountant: 'Бухгалтерия', rejected: 'Рад карда шуд', approved: 'Бомуваффакият қабул карда шуд',
    family_video: 'Видеои кандидат оила', help_later: 'Баъдтар кумак мекунем',
    bank_card: 'Рақами банкии карт', deleted: 'Нест карда шуд',
};
const ROLE_LABELS = { operator: 'Оператор', reviewer: 'Кумита', accountant: 'Бухгалтер', superuser: 'Супер Админ', admin: 'Админ' };
const ROLE_COLORS = {
    operator: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    reviewer: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    accountant: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    superuser: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    admin: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};
const STATUS_COLORS = {
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    under_review: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    to_accountant: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    bank_card: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    submitted: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    new_message: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
    family_video: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
    help_later: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    deleted: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};
const PERIOD_OPTIONS = [
    { value: 'all', label: 'Ҳамагӣ', icon: Target },
    { value: 'today', label: 'Имрӯз', icon: Calendar },
    { value: 'week', label: 'Ҳафта', icon: Calendar },
    { value: 'month', label: 'Моҳ', icon: Calendar },
];

// ─────────────────────────────────────────────
export default function UsersPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('users'); // 'users' | 'activity'

    // --- Users State ---
    const [users, setUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);
    const [userModal, setUserModal] = useState({ open: false, data: null });
    const [formData, setFormData] = useState({ username: '', password: '', role: 'operator', status: 'active' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // --- Activity State ---
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState(null);
    const [userStats, setUserStats] = useState([]);
    const [expandedUsers, setExpandedUsers] = useState({});
    const [period, setPeriod] = useState('all');
    const [viewMode, setViewMode] = useState('list');

    // --- Init ---
    useEffect(() => {
        try { setCurrentUser(JSON.parse(localStorage.getItem('user'))); } catch (e) {}
    }, []);

    const isAdmin = useMemo(() => currentUser?.role === 'admin' || currentUser?.role === 'superuser', [currentUser]);
    const isSuperuser = currentUser?.role === 'superuser';

    // --- Users Data ---
    const loadUsers = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const response = await getUsers();
            setUsers(response.data || []);
        } catch {
            setError('Ҳангоми боркунии корбарон хатогӣ рӯй дод.');
        } finally { setLoading(false); }
    }, []);

    const loadOnlineUsersData = useCallback(async () => {
        try {
            const response = await getOnlineUsers();
            setOnlineUsers(response.data.users || []);
        } catch {}
    }, []);

    useEffect(() => {
        loadUsers();
        loadOnlineUsersData();
        const interval = setInterval(loadOnlineUsersData, 60000);
        return () => clearInterval(interval);
    }, [loadUsers, loadOnlineUsersData]);

    // --- Activity Data ---
    const loadActivity = useCallback(async () => {
        setActivityLoading(true); setActivityError(null);
        try {
            const response = await getUserActivityStats({ period });
            setUserStats(response.data.users || []);
        } catch {
            setActivityError('Ҳангоми боркунии маълумот хатогӣ рӯй дод.');
        } finally { setActivityLoading(false); }
    }, [period]);

    useEffect(() => {
        if (activeTab === 'activity') loadActivity();
    }, [activeTab, loadActivity]);

    // --- User Handlers ---
    const handleOpenUserModal = (user = null) => {
        setUserModal({ open: true, data: user });
        setFormData(user
            ? { username: user.username, password: '', role: user.role, status: user.is_active ? 'active' : 'inactive' }
            : { username: '', password: '', role: 'operator', status: 'active' }
        );
    };
    const handleCloseUserModal = () => { setUserModal({ open: false, data: null }); setError(null); };

    const handleSaveUser = async () => {
        if (!formData.username?.trim()) { setError('Номи корбар зарур аст.'); return; }
        if (!userModal.data && !formData.password?.trim()) { setError('Парол зарур аст.'); return; }
        setIsSubmitting(true); setError(null);
        try {
            const payload = { username: formData.username, role: formData.role, is_active: formData.status === 'active' };
            if (formData.password?.trim()) payload.password = formData.password;
            if (userModal.data) await updateUser(userModal.data.id, payload);
            else await createUser(payload);
            await loadUsers(); handleCloseUserModal();
        } catch { setError('Ҳангоми сабти корбар хатогӣ рӯй дод.');
        } finally { setIsSubmitting(false); }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Ин корбарро ҳазф кардан мехоҳед?')) return;
        setDeleteLoading(true);
        try { await deleteUser(id); await loadUsers(); }
        catch { setError('Ҳангоми ҳазфи корбар хатогӣ рӯй дод.'); }
        finally { setDeleteLoading(false); }
    };

    const isSelfUser = (user) => currentUser && String(currentUser.id) === String(user.id);

    const filteredUsers = useMemo(() => {
        if (!search) return users;
        return users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));
    }, [users, search]);

    const stats = useMemo(() => [
        { label: 'Ҳамаи корбарон', value: users.length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Админҳо', value: users.filter(u => u.role === 'admin' || u.role === 'superuser').length, color: 'text-red-400', bg: 'bg-red-500/10' },
        { label: 'Операторҳо', value: users.filter(u => u.role === 'operator').length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Онлайн', value: onlineUsers.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ], [users, onlineUsers]);

    // --- Activity Helpers ---
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        try { return new Date(dateString).toLocaleString('tg-TJ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return dateString; }
    };

    const summaryStats = useMemo(() => {
        if (!userStats.length) return [];
        return [
            { label: 'Ҳамагӣ корбарон', value: userStats.length, icon: Users, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
            { label: 'Тағйироти вазъият', value: userStats.reduce((s, u) => s + u.status_changes_count, 0), icon: TrendingUp, bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Формаҳои эҷодшуда', value: userStats.reduce((s, u) => s + u.created_forms_count, 0), icon: FileEdit, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
            { label: 'Ҳамагӣ амалиётҳо', value: userStats.reduce((s, u) => s + u.total_actions, 0), icon: Activity, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
        ];
    }, [userStats]);

    const maxValues = useMemo(() => {
        if (!userStats.length) return { status: 1, created: 1, updated: 1, notes: 1 };
        return {
            status: Math.max(...userStats.map(u => u.status_changes_count || 1), 1),
            created: Math.max(...userStats.map(u => u.created_forms_count || 1), 1),
            updated: Math.max(...userStats.map(u => u.updated_forms_count || 1), 1),
            notes: Math.max(...userStats.map(u => u.notes_count || 1), 1),
        };
    }, [userStats]);

    // ─── Render ───────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 md:p-8">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/20">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
                                    Корбар
                                </h1>
                                <p className="text-slate-400 text-sm md:text-base mt-1">Системаи идоракунии корбарон</p>
                            </div>
                        </div>
                        {activeTab === 'users' && isAdmin && (
                            <button onClick={() => handleOpenUserModal(null)}
                                className="group relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-semibold rounded-xl overflow-hidden shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all active:scale-95">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <UserPlus className="w-5 h-5 relative z-10" />
                                <span className="relative z-10">Корбари нав</span>
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-slate-900 border border-white/10 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users className="w-4 h-4" />
                        Корбарон
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'activity' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Activity className="w-4 h-4" />
                        Фаъолияти корбарон
                    </button>
                </div>

                {/* ── TAB: USERS ── */}
                {activeTab === 'users' && (
                    <>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                                {error}
                            </motion.div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats.map((stat, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                                    className="p-4 rounded-2xl border border-white/5 bg-slate-900 shadow-xl overflow-hidden relative group">
                                    <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 blur-xl group-hover:opacity-20 transition-all ${stat.bg.replace('/10', '/30')}`} />
                                    <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                                    <h3 className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
                                </motion.div>
                            ))}
                        </div>

                        {/* Table */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-slate-950/30 flex items-center gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="text" placeholder="Ҷустуҷӯи корбар..." value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-950/50 text-xs uppercase font-semibold text-slate-400">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Корбар</th>
                                            <th className="px-6 py-4 text-left">Рол</th>
                                            <th className="px-6 py-4 text-left">Ҳолат</th>
                                            <th className="px-6 py-4 text-right">Амалҳо</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.length === 0 ? (
                                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Ҳеҷ корбар ёфт нашуд</td></tr>
                                        ) : filteredUsers.map((user, idx) => {
                                            const isOnline = onlineUsers.some(u => u.id === user.id);
                                            const roleConfig = ROLES[user.role] || ROLES.operator;
                                            return (
                                                <motion.tr key={user.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                                    className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${roleConfig.bg} ${roleConfig.color}`}>
                                                                    {user.username.charAt(0).toUpperCase()}
                                                                </div>
                                                                {isOnline && (
                                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
                                                                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-white">{user.username}</p>
                                                                    {isOnline && <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500 text-white rounded-full">Онлайн</span>}
                                                                </div>
                                                                <p className="text-xs text-slate-500">ID: {user.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleConfig.bg} ${roleConfig.color} ${roleConfig.border}`}>
                                                            {roleConfig.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                            {user.is_active ? 'Фаъол' : 'Ғайрифаъол'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {isSelfUser(user) && (
                                                                <button onClick={() => router.push('/dashboard/profile')}
                                                                    className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all" title="Тағйири парол">
                                                                    <Lock className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {isAdmin && (
                                                                <>
                                                                    <button onClick={() => handleOpenUserModal(user)}
                                                                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" title="Таҳрир кардан">
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    {user.id !== currentUser?.id && (
                                                                        <button onClick={() => handleDeleteUser(user.id)} disabled={deleteLoading}
                                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50" title="Ҳазф кардан">
                                                                            {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </>
                )}

                {/* ── TAB: ACTIVITY ── */}
                {activeTab === 'activity' && (
                    <>
                        {activityLoading ? (
                            <div className="flex items-center justify-center min-h-[40vh]">
                                <div className="text-center space-y-4">
                                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
                                    <p className="text-slate-400">Боркунии маълумот...</p>
                                </div>
                            </div>
                        ) : activityError ? (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>{activityError}</span>
                            </div>
                        ) : (
                            <>
                                {/* Activity Filters */}
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-900 border border-white/10 rounded-2xl p-5 flex flex-wrap gap-6">
                                    {isSuperuser && (
                                        <>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-2 font-medium uppercase">Муддат</p>
                                                <div className="flex gap-2 p-1 bg-slate-800/50 border border-white/5 rounded-xl">
                                                    {PERIOD_OPTIONS.map((opt) => {
                                                        const Icon = opt.icon;
                                                        return (
                                                            <button key={opt.value} onClick={() => setPeriod(opt.value)}
                                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${period === opt.value ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                                                <Icon className="w-4 h-4" />
                                                                {opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-2 font-medium uppercase">Намоиш</p>
                                                <div className="flex gap-2 p-1 bg-slate-800/50 border border-white/5 rounded-xl">
                                                    <button onClick={() => setViewMode('list')}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                                        <List className="w-4 h-4" /> Рӯйхат
                                                    </button>
                                                    <button onClick={() => setViewMode('chart')}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'chart' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                                        <BarChart3 className="w-4 h-4" /> График
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>

                                {/* Summary Stats */}
                                {userStats.length > 0 && (
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {summaryStats.map((stat, idx) => {
                                            const Icon = stat.icon;
                                            return (
                                                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                                                    className={`relative p-4 md:p-6 rounded-2xl border ${stat.border} ${stat.bg} overflow-hidden hover:scale-105 transition-transform`}>
                                                    <Icon className={`w-8 h-8 ${stat.text} mb-3`} />
                                                    <p className="text-slate-400 text-sm font-medium mb-1">{stat.label}</p>
                                                    <h3 className={`text-2xl md:text-3xl font-bold ${stat.text}`}>{stat.value}</h3>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* User Stats List / Chart */}
                                {userStats.length === 0 ? (
                                    <div className="p-8 bg-slate-900 border border-white/10 rounded-2xl text-center">
                                        <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                                        <p className="text-slate-400">Маълумоти фаъолият нест.</p>
                                    </div>
                                ) : viewMode === 'chart' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {userStats.map((us, idx) => {
                                            const rc = ROLE_COLORS[us.role] || ROLE_COLORS.operator;
                                            return (
                                                <motion.div key={us.user_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                                    className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all">
                                                    <div className={`p-4 border-b border-white/5 ${rc.bg}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${rc.bg} ${rc.text} border ${rc.border}`}>
                                                                {us.full_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-white font-bold truncate">{us.full_name}</h3>
                                                                <p className="text-xs text-slate-400">@{us.username}</p>
                                                            </div>
                                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${rc.bg} ${rc.text} ${rc.border}`}>{ROLE_LABELS[us.role] || us.role}</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 space-y-3">
                                                        {[
                                                            { label: 'Тағйироти вазъият', val: us.status_changes_count, max: maxValues.status, color: 'from-blue-500 to-cyan-500', text: 'text-blue-400', Icon: TrendingUp },
                                                            { label: 'Формаҳои эҷодшуда', val: us.created_forms_count, max: maxValues.created, color: 'from-emerald-500 to-teal-500', text: 'text-emerald-400', Icon: FileEdit },
                                                            { label: 'Формаҳои навсозӣ', val: us.updated_forms_count, max: maxValues.updated, color: 'from-purple-500 to-pink-500', text: 'text-purple-400', Icon: Zap },
                                                            { label: 'Шарҳҳо', val: us.notes_count, max: maxValues.notes, color: 'from-amber-500 to-orange-500', text: 'text-amber-400', Icon: MessageSquare },
                                                        ].map(({ label, val, max, color, text, Icon }) => (
                                                            <div key={label}>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs text-slate-400 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</span>
                                                                    <span className={`text-sm font-bold ${text}`}>{val}</span>
                                                                </div>
                                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(val / max) * 100}%` }} transition={{ delay: idx * 0.05 + 0.2, duration: 0.5 }}
                                                                        className={`h-full bg-gradient-to-r ${color}`} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="p-4 bg-slate-950/30 border-t border-white/5 flex items-center justify-between">
                                                        <span className="text-xs text-slate-500">Ҳамагӣ амалиётҳо</span>
                                                        <span className="text-lg font-bold text-white flex items-center gap-1"><Award className="w-4 h-4 text-amber-500" />{us.total_actions}</span>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {userStats.map((us, idx) => {
                                            const rc = ROLE_COLORS[us.role] || ROLE_COLORS.operator;
                                            const isExpanded = expandedUsers[us.user_id];
                                            return (
                                                <motion.div key={us.user_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                                    className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all">
                                                    <div className="p-4 md:p-6">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${rc.bg} ${rc.text} border-2 ${rc.border}`}>
                                                                    {us.full_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-xl font-bold text-white">{us.full_name}</h3>
                                                                    <p className="text-sm text-slate-400">@{us.username}</p>
                                                                    {us.last_activity && <p className="text-xs text-slate-500 mt-1">Охирин фаъолият: {formatDate(us.last_activity)}</p>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${rc.bg} ${rc.text} ${rc.border}`}>{ROLE_LABELS[us.role] || us.role}</span>
                                                                <button onClick={() => setExpandedUsers(p => ({ ...p, [us.user_id]: !p[us.user_id] }))}
                                                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                                                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                                            {[
                                                                { label: 'Тағйироти вазъият', val: us.status_changes_count, bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', Icon: TrendingUp },
                                                                { label: 'Формаҳои эҷодшуда', val: us.created_forms_count, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', Icon: FileEdit },
                                                                { label: 'Формаҳои навсозӣ', val: us.updated_forms_count, bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', Icon: Zap },
                                                                { label: 'Шарҳҳо', val: us.notes_count, bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', Icon: MessageSquare },
                                                            ].map(({ label, val, bg, border, text, Icon }) => (
                                                                <div key={label} className={`p-3 ${bg} border ${border} rounded-xl`}>
                                                                    <Icon className={`w-5 h-5 ${text} mb-1`} />
                                                                    <p className="text-xs text-slate-400">{label}</p>
                                                                    <p className={`text-xl font-bold ${text}`}>{val}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="mt-4 p-3 bg-slate-950/50 border border-white/5 rounded-xl flex items-center justify-between">
                                                            <span className="text-sm text-slate-400 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" />Ҳамагӣ амалиётҳо</span>
                                                            <span className="text-2xl font-bold text-white">{us.total_actions}</span>
                                                        </div>
                                                    </div>
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                                                                className="border-t border-white/5 bg-slate-950/30 overflow-hidden">
                                                                <div className="p-4 md:p-6">
                                                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                                                        <BarChart3 className="w-4 h-4 text-blue-500" />Тағйироти вазъият барои ҳар як навъ
                                                                    </h4>
                                                                    {us.status_changes_by_type?.length > 0 ? (
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {us.status_changes_by_type.map((item, i) => {
                                                                                const sc = STATUS_COLORS[item.status] || STATUS_COLORS.new_message;
                                                                                return (
                                                                                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                                                                                        className={`px-3 py-2 rounded-lg border ${sc.bg} ${sc.text} ${sc.border} flex items-center gap-2`}>
                                                                                        <TrendingUp className="w-3 h-3" />
                                                                                        <span className="text-sm font-medium">{STATUS_LABELS[item.status] || item.status}</span>
                                                                                        <span className="text-sm font-bold">{item.count}</span>
                                                                                    </motion.div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : <p className="text-sm text-slate-500">Тағйироти вазъият нест.</p>}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* User Modal */}
            <AnimatePresence>
                {userModal.open && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={handleCloseUserModal} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4">
                            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/30">
                                    <h2 className="text-xl font-bold text-white">{userModal.data ? 'Таҳрири корбар' : 'Корбари нав'}</h2>
                                    <button onClick={handleCloseUserModal}><XCircle className="w-6 h-6 text-slate-400 hover:text-white transition-colors" /></button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Номи корбар</label>
                                        <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-2">
                                            Парол {userModal.data && <span className="text-slate-500 normal-case">(Холӣ гузоред, агар тағйир надиҳед)</span>}
                                        </label>
                                        <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder={userModal.data ? 'Барои тағйир ворид кунед' : 'Парол'} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Рол</label>
                                        <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                                            {Object.entries(ROLES).map(([key, cfg]) => <option key={key} value={key} className="bg-slate-900">{cfg.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Ҳолат</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                                            <option value="active" className="bg-slate-900">Фаъол</option>
                                            <option value="inactive" className="bg-slate-900">Ғайрифаъол</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-950/30 flex gap-3">
                                    <button onClick={handleCloseUserModal} className="flex-1 px-4 py-3 border border-white/10 text-slate-300 font-medium rounded-xl hover:bg-white/5 transition-all">Бекор кардан</button>
                                    <button onClick={handleSaveUser} disabled={isSubmitting}
                                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                        {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" />Сабт карда мешавад...</> : userModal.data ? 'Таҳрир кардан' : 'Илова кардан'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
