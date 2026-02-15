'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Activity,
    TrendingUp,
    Users,
    FileEdit,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    BarChart3,
    List,
    Calendar,
    Loader2,
    AlertCircle,
    Award,
    Zap,
    Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserActivityStats } from '@/services/api';

// --- Constants ---
const STATUS_LABELS = {
    'new_message': 'Паёми нав',
    'submitted': 'Пуркардани анкета',
    'under_review': 'Кумита',
    'to_accountant': 'Бухгалтерия',
    'rejected': 'Рад карда шуд',
    'approved': 'Бомуваффакият кабул карда шуд',
    'family_video': 'Видеои кандидат оила',
    'help_later': 'Баъдтар кумак мекунем',
    'bank_card': 'Рақами банкии карт',
    'deleted': 'Удалит',
};

const ROLE_LABELS = {
    'operator': 'Operator',
    'reviewer': 'Reviewer',
    'accountant': 'Accountant',
    'superuser': 'SuperUser',
};

const ROLE_COLORS = {
    'operator': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    'reviewer': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    'accountant': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    'superuser': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

const STATUS_COLORS = {
    'approved': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    'rejected': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    'under_review': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    'to_accountant': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    'bank_card': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    'submitted': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    'new_message': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
    'family_video': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
    'help_later': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    'deleted': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

const PERIOD_OPTIONS = [
    { value: 'all', label: 'Ҳамагӣ', icon: Target },
    { value: 'today', label: 'Имрӯз', icon: Calendar },
    { value: 'week', label: 'Ҳафта', icon: Calendar },
    { value: 'month', label: 'Моҳ', icon: Calendar },
];

export default function UserActivityPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userStats, setUserStats] = useState([]);
    const [expandedUsers, setExpandedUsers] = useState({});
    const [period, setPeriod] = useState('all');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'chart'

    // Get current user
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user'));
        } catch {
            return null;
        }
    }, []);

    const isSuperuser = user?.role === 'superuser';

    // Load user stats
    const loadUserStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getUserActivityStats({ period });
            setUserStats(response.data.users || []);
        } catch (err) {
            console.error('Error loading user stats:', err);
            setError('Ҳангоми боркунии маълумот хатогӣ рӯй дод.');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        loadUserStats();
    }, [loadUserStats]);

    const toggleUserExpansion = (userId) => {
        setExpandedUsers((prev) => ({
            ...prev,
            [userId]: !prev[userId],
        }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('tg-TJ', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        if (!userStats.length) return [];
        return [
            {
                label: 'Ҳамагӣ корбарон',
                value: userStats.length,
                icon: Users,
                color: 'blue',
                bg: 'bg-blue-500/10',
                text: 'text-blue-400',
                border: 'border-blue-500/20',
            },
            {
                label: 'Тағйироти вазъият',
                value: userStats.reduce((sum, u) => sum + u.status_changes_count, 0),
                icon: TrendingUp,
                color: 'emerald',
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-400',
                border: 'border-emerald-500/20',
            },
            {
                label: 'Формаҳои эҷодшуда',
                value: userStats.reduce((sum, u) => sum + u.created_forms_count, 0),
                icon: FileEdit,
                color: 'purple',
                bg: 'bg-purple-500/10',
                text: 'text-purple-400',
                border: 'border-purple-500/20',
            },
            {
                label: 'Ҳамагӣ амалиётҳо',
                value: userStats.reduce((sum, u) => sum + u.total_actions, 0),
                icon: Activity,
                color: 'amber',
                bg: 'bg-amber-500/10',
                text: 'text-amber-400',
                border: 'border-amber-500/20',
            },
        ];
    }, [userStats]);

    // Get max values for chart scaling
    const maxValues = useMemo(() => {
        if (!userStats.length) return { status: 1, created: 1, updated: 1, notes: 1 };
        return {
            status: Math.max(...userStats.map(u => u.status_changes_count || 1), 1),
            created: Math.max(...userStats.map(u => u.created_forms_count || 1), 1),
            updated: Math.max(...userStats.map(u => u.updated_forms_count || 1), 1),
            notes: Math.max(...userStats.map(u => u.notes_count || 1), 1),
        };
    }, [userStats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
                    <p className="text-slate-400">Боркунии маълумот...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3"
                >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </motion.div>
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
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
                            <Activity className="w-8 h-8 text-blue-500" />
                            Фаъолияти корбарон
                        </h1>
                        <p className="text-slate-400 mt-1">Омори амалиётҳои корбарон дар система</p>
                    </div>

                    {isSuperuser && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Period Filter */}
                            <div className="flex gap-2 p-1 bg-slate-900 border border-white/10 rounded-xl">
                                {PERIOD_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => setPeriod(opt.value)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${period === opt.value
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="hidden sm:inline">{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex gap-2 p-1 bg-slate-900 border border-white/10 rounded-xl">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${viewMode === 'list'
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <List className="w-4 h-4" />
                                    <span className="hidden sm:inline">Рӯйхат</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('chart')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${viewMode === 'chart'
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    <span className="hidden sm:inline">График</span>
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Summary Stats */}
                {userStats.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {summaryStats.map((stat, idx) => {
                            const Icon = stat.icon;
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`relative p-4 md:p-6 rounded-2xl border ${stat.border} ${stat.bg} overflow-hidden group hover:scale-105 transition-transform`}
                                >
                                    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl ${stat.bg.replace('/10', '/30')}`} />
                                    <Icon className={`w-8 h-8 ${stat.text} mb-3`} />
                                    <p className="text-slate-400 text-sm font-medium mb-1">{stat.label}</p>
                                    <h3 className={`text-2xl md:text-3xl font-bold ${stat.text}`}>{stat.value}</h3>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* User Stats */}
                {userStats.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-8 bg-slate-900 border border-white/10 rounded-2xl text-center"
                    >
                        <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400">Маълумоти фаъолият нест.</p>
                    </motion.div>
                ) : viewMode === 'chart' ? (
                    // Chart View
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {userStats.map((userStat, idx) => {
                            const roleConfig = ROLE_COLORS[userStat.role] || ROLE_COLORS.operator;
                            return (
                                <motion.div
                                    key={userStat.user_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group"
                                >
                                    {/* User Header */}
                                    <div className={`p-4 border-b border-white/5 ${roleConfig.bg}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${roleConfig.bg} ${roleConfig.text} border ${roleConfig.border}`}>
                                                {userStat.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-bold truncate">{userStat.full_name}</h3>
                                                <p className="text-xs text-slate-400 truncate">@{userStat.username}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}>
                                                {ROLE_LABELS[userStat.role] || userStat.role}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats Bars */}
                                    <div className="p-4 space-y-3">
                                        {/* Status Changes */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3" />
                                                    Тағйироти вазъият
                                                </span>
                                                <span className="text-sm font-bold text-blue-400">{userStat.status_changes_count}</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(userStat.status_changes_count / maxValues.status) * 100}%` }}
                                                    transition={{ delay: idx * 0.05 + 0.2, duration: 0.5 }}
                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Created Forms */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <FileEdit className="w-3 h-3" />
                                                    Формаҳои эҷодшуда
                                                </span>
                                                <span className="text-sm font-bold text-emerald-400">{userStat.created_forms_count}</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(userStat.created_forms_count / maxValues.created) * 100}%` }}
                                                    transition={{ delay: idx * 0.05 + 0.3, duration: 0.5 }}
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Updated Forms */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Zap className="w-3 h-3" />
                                                    Формаҳои навсозӣ
                                                </span>
                                                <span className="text-sm font-bold text-purple-400">{userStat.updated_forms_count}</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(userStat.updated_forms_count / maxValues.updated) * 100}%` }}
                                                    transition={{ delay: idx * 0.05 + 0.4, duration: 0.5 }}
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <MessageSquare className="w-3 h-3" />
                                                    Шарҳҳо
                                                </span>
                                                <span className="text-sm font-bold text-amber-400">{userStat.notes_count}</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(userStat.notes_count / maxValues.notes) * 100}%` }}
                                                    transition={{ delay: idx * 0.05 + 0.5, duration: 0.5 }}
                                                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="p-4 bg-slate-950/30 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Ҳамагӣ амалиётҳо</span>
                                        <span className="text-lg font-bold text-white flex items-center gap-1">
                                            <Award className="w-4 h-4 text-amber-500" />
                                            {userStat.total_actions}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    // List View
                    <div className="space-y-4">
                        {userStats.map((userStat, idx) => {
                            const roleConfig = ROLE_COLORS[userStat.role] || ROLE_COLORS.operator;
                            const isExpanded = expandedUsers[userStat.user_id];

                            return (
                                <motion.div
                                    key={userStat.user_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all"
                                >
                                    {/* User Header */}
                                    <div className="p-4 md:p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${roleConfig.bg} ${roleConfig.text} border-2 ${roleConfig.border}`}>
                                                    {userStat.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-white">{userStat.full_name}</h3>
                                                    <p className="text-sm text-slate-400">@{userStat.username}</p>
                                                    {userStat.last_activity && (
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            Охирин фаъолият: {formatDate(userStat.last_activity)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}>
                                                    {ROLE_LABELS[userStat.role] || userStat.role}
                                                </span>
                                                <button
                                                    onClick={() => toggleUserExpansion(userStat.user_id)}
                                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-5 h-5 text-slate-400" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                <TrendingUp className="w-5 h-5 text-blue-400 mb-1" />
                                                <p className="text-xs text-slate-400">Тағйироти вазъият</p>
                                                <p className="text-xl font-bold text-blue-400">{userStat.status_changes_count}</p>
                                            </div>
                                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                <FileEdit className="w-5 h-5 text-emerald-400 mb-1" />
                                                <p className="text-xs text-slate-400">Формаҳои эҷодшуда</p>
                                                <p className="text-xl font-bold text-emerald-400">{userStat.created_forms_count}</p>
                                            </div>
                                            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                                <Zap className="w-5 h-5 text-purple-400 mb-1" />
                                                <p className="text-xs text-slate-400">Формаҳои навсозӣ</p>
                                                <p className="text-xl font-bold text-purple-400">{userStat.updated_forms_count}</p>
                                            </div>
                                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                                <MessageSquare className="w-5 h-5 text-amber-400 mb-1" />
                                                <p className="text-xs text-slate-400">Шарҳҳо</p>
                                                <p className="text-xl font-bold text-amber-400">{userStat.notes_count}</p>
                                            </div>
                                        </div>

                                        {/* Total Actions */}
                                        <div className="mt-4 p-3 bg-slate-950/50 border border-white/5 rounded-xl flex items-center justify-between">
                                            <span className="text-sm text-slate-400 flex items-center gap-2">
                                                <Award className="w-4 h-4 text-amber-500" />
                                                Ҳамагӣ амалиётҳо
                                            </span>
                                            <span className="text-2xl font-bold text-white">{userStat.total_actions}</span>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="border-t border-white/5 bg-slate-950/30 overflow-hidden"
                                            >
                                                <div className="p-4 md:p-6">
                                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                                        <BarChart3 className="w-4 h-4 text-blue-500" />
                                                        Тағйироти вазъият барои ҳар як навъ
                                                    </h4>
                                                    {userStat.status_changes_by_type && userStat.status_changes_by_type.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {userStat.status_changes_by_type.map((item, itemIdx) => {
                                                                const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.new_message;
                                                                return (
                                                                    <motion.div
                                                                        key={itemIdx}
                                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        transition={{ delay: itemIdx * 0.05 }}
                                                                        className={`px-3 py-2 rounded-lg border ${statusColor.bg} ${statusColor.text} ${statusColor.border} flex items-center gap-2`}
                                                                    >
                                                                        <TrendingUp className="w-3 h-3" />
                                                                        <span className="text-sm font-medium">
                                                                            {STATUS_LABELS[item.status] || item.status}
                                                                        </span>
                                                                        <span className="text-sm font-bold">{item.count}</span>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-slate-500">Тағйироти вазъият нест.</p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
