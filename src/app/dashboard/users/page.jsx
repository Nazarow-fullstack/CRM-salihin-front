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
    XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getOnlineUsers
} from '@/services/api';

// --- Roles Configuration ---
const ROLES = {
    superuser: { label: 'Супер Админ', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    admin: { label: 'Админ', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    operator: { label: 'Оператор', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    reviewer: { label: 'Кумита', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    accountant: { label: 'Бухгалтер', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
};

export default function UsersPage() {
    const router = useRouter();

    // --- State ---
    const [users, setUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);

    // Modal
    const [userModal, setUserModal] = useState({ open: false, data: null }); // null = create, obj = edit

    // Form
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'operator',
        status: 'active'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // --- Load User Data ---
    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            setCurrentUser(user);
        } catch (e) { }
    }, []);

    const isAdmin = useMemo(() => {
        return currentUser?.role === 'admin' || currentUser?.role === 'superuser';
    }, [currentUser]);

    // --- Data Fetching ---
    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getUsers();
            setUsers(response.data || []);
        } catch (error) {
            console.error("Failed to load users", error);
            setError('Ҳангоми боркунии корбарон хатогӣ рӯй дод.');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadOnlineUsersData = useCallback(async () => {
        try {
            const response = await getOnlineUsers();
            setOnlineUsers(response.data.users || []);
        } catch (error) {
            console.error("Failed to load online users", error);
        }
    }, []);

    useEffect(() => {
        loadUsers();
        loadOnlineUsersData();
        const interval = setInterval(loadOnlineUsersData, 60000); // Poll every 60s
        return () => clearInterval(interval);
    }, [loadUsers, loadOnlineUsersData]);

    // --- Handlers ---
    const handleOpenUserModal = (user = null) => {
        setUserModal({ open: true, data: user });
        if (user) {
            setFormData({
                username: user.username,
                password: '', // Password field empty for editing
                role: user.role,
                status: user.is_active ? 'active' : 'inactive'
            });
        } else {
            setFormData({
                username: '',
                password: '',
                role: 'operator',
                status: 'active'
            });
        }
    };

    const handleCloseUserModal = () => {
        setUserModal({ open: false, data: null });
        setError(null);
    };

    const handleSaveUser = async () => {
        // Validation
        if (!formData.username || !formData.username.trim()) {
            setError('Номи корбар зарур аст.');
            return;
        }

        if (!userModal.data && (!formData.password || !formData.password.trim())) {
            setError('Парол зарур аст.');
            return;
        }

        if (!formData.role) {
            setError('Рол интихоб кардан зарур аст.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const payload = {
                username: formData.username,
                role: formData.role,
                is_active: formData.status === 'active'
            };

            // Only include password if it's provided
            if (formData.password && formData.password.trim()) {
                payload.password = formData.password;
            }

            if (userModal.data) {
                // Update existing user
                await updateUser(userModal.data.id, payload);
            } else {
                // Create new user
                await createUser(payload);
            }

            await loadUsers();
            handleCloseUserModal();
        } catch (error) {
            console.error("Failed to save user", error);
            setError('Ҳангоми сабти корбар хатогӣ рӯй дод.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Ин корбарро ҳазф кардан мехоҳед?')) return;
        setDeleteLoading(true);
        setError(null);
        try {
            await deleteUser(id);
            await loadUsers();
        } catch (error) {
            console.error("Delete failed", error);
            setError('Ҳангоми ҳазфи корбар хатогӣ рӯй дод.');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Helper to check if user is viewing their own profile
    const isSelfUser = (user) => {
        if (!currentUser || !user) return false;
        return String(currentUser.id) === String(user.id);
    };

    // --- Filtering ---
    const filteredUsers = useMemo(() => {
        if (!search) return users;
        return users.filter(u =>
            u.username.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    // --- Stats ---
    const stats = useMemo(() => {
        return [
            { label: 'Ҳамаи корбарон', value: users.length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Админҳо', value: users.filter(u => u.role === 'admin' || u.role === 'superuser').length, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Операторҳо', value: users.filter(u => u.role === 'operator').length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Онлайн', value: onlineUsers.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ];
    }, [users, onlineUsers]);

    // --- Render ---
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
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-white">Истифодабарандагон</h1>
                        <p className="text-slate-400">Системаи идоракунии корбарон</p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => handleOpenUserModal(null)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95"
                        >
                            <UserPlus className="w-5 h-5" />
                            Корбари нав
                        </button>
                    )}
                </motion.div>

                {/* Error Alert */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-4 rounded-2xl border border-white/5 bg-slate-900 shadow-xl overflow-hidden relative group`}
                        >
                            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 blur-xl group-hover:opacity-20 transition-all ${stat.bg.replace('/10', '/30')}`} />
                            <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                            <h3 className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</h3>
                        </motion.div>
                    ))}
                </div>

                {/* Users Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                >
                    {/* Toolbar */}
                    <div className="p-4 border-b border-white/5 bg-slate-950/30 flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Ҷустуҷӯи корбар..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
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
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                                            Ҳеҷ корбар ёфт нашуд
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user, idx) => {
                                        const isOnline = onlineUsers.some(u => u.id === user.id);
                                        const roleConfig = ROLES[user.role] || ROLES.operator;

                                        return (
                                            <motion.tr
                                                key={user.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="hover:bg-white/5 transition-colors"
                                            >
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
                                                                {isOnline && (
                                                                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500 text-white rounded-full">
                                                                        Онлайн
                                                                    </span>
                                                                )}
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
                                                            <button
                                                                onClick={() => router.push('/dashboard/profile')}
                                                                className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all"
                                                                title="Тағйири парол"
                                                            >
                                                                <Lock className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleOpenUserModal(user)}
                                                                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                                    title="Таҳрир кардан"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                {user.id !== currentUser?.id && (
                                                                    <button
                                                                        onClick={() => handleDeleteUser(user.id)}
                                                                        disabled={deleteLoading}
                                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                                                                        title="Ҳазф кардан"
                                                                    >
                                                                        {deleteLoading ? (
                                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            {/* User Modal */}
            <AnimatePresence>
                {userModal.open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={handleCloseUserModal}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4"
                        >
                            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/30">
                                    <h2 className="text-xl font-bold text-white">
                                        {userModal.data ? 'Таҳрири корбар' : 'Корбари нав'}
                                    </h2>
                                    <button onClick={handleCloseUserModal}>
                                        <XCircle className="w-6 h-6 text-slate-400 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                            {error}
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Номи корбар</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-2">
                                            Парол {userModal.data && <span className="text-slate-500 normal-case">(Холӣ гузоред, агар тағйир надиҳед)</span>}
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            placeholder={userModal.data ? "Барои тағйир ворид кунед" : "Парол"}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Рол</label>
                                        <select
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        >
                                            {Object.entries(ROLES).map(([key, config]) => (
                                                <option key={key} value={key} className="bg-slate-900">{config.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Ҳолат</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="active" className="bg-slate-900">Фаъол</option>
                                            <option value="inactive" className="bg-slate-900">Ғайрифаъол</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-950/30 flex gap-3">
                                    <button
                                        onClick={handleCloseUserModal}
                                        className="flex-1 px-4 py-3 border border-white/10 text-slate-300 font-medium rounded-xl hover:bg-white/5 transition-all"
                                    >
                                        Бекор кардан
                                    </button>
                                    <button
                                        onClick={handleSaveUser}
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Сабт карда мешавад...
                                            </>
                                        ) : (
                                            userModal.data ? 'Таҳрир кардан' : 'Илова кардан'
                                        )}
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
