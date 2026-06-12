'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Users,
    ChevronLeft,
    ChevronRight,
    Loader2,
    UserCircle,
    XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatFormDisplayName } from '@/lib/formDisplayName';
import api from '@/lib/axios';

// --- CONFIGURATION ---
const STATUS_CONFIG = {
    new_message:   { label: 'Паёми нав',          color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
    submitted:     { label: 'Пуркардани анкета',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
    under_review:  { label: 'Кумита',              color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
    to_accountant: { label: 'Бухгалтерия',         color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400' },
    rejected:      { label: 'Рад',                 color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
    approved:      { label: 'Кумакшуда',           color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
    family_video:  { label: 'Видеои',              color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400' },
    help_later:    { label: 'Баъдтар',             color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
    bank_card:     { label: 'Ҳуҷҷат',             color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
    deleted:       { label: 'Нест карда шуд',      color: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-500' },
};

const PAGE_SIZE = 10;

export default function FamiliesPage() {
    const router = useRouter();

    const [forms, setForms]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [search, setSearch]         = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage]             = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasNext, setHasNext]       = useState(false);
    const [hasPrev, setHasPrev]       = useState(false);

    // Debounce search — 400ms
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // reset page on new search
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // Fetch from server
    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const params = { page, page_size: PAGE_SIZE };
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

            const res = await api.get('/forms/', { params });
            const data = res.data;

            // DRF may return { results, count, next, previous } or plain array
            if (Array.isArray(data)) {
                setForms(data);
                setTotalCount(data.length);
                setHasNext(false);
                setHasPrev(false);
            } else {
                setForms(Array.isArray(data.results) ? data.results : []);
                setTotalCount(typeof data.count === 'number' ? data.count : 0);
                setHasNext(Boolean(data.next));
                setHasPrev(Boolean(data.previous));
            }
        } catch {
            setFetchError('Маълумот бор нашуд. Лутфан дубора кӯшиш кунед.');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // ── Render ──────────────────────────────────────────────

    if (fetchError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <XCircle className="w-12 h-12 text-red-400" />
                <p className="text-slate-400 text-lg">{fetchError}</p>
                <button
                    onClick={fetchData}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                >
                    Дубора кӯшиш кунед
                </button>
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
                    className="relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 rounded-3xl blur-2xl" />
                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                                        Кӯмаки оилаҳо
                                    </h1>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {totalCount > 0 ? `${totalCount} оила` : 'Оилаҳо ёфт нашуданд'}
                                    </p>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative group max-w-md">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Ҷустуҷӯ бо ном, телефон..."
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-950/50 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Номи оила</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Сабаби кӯмак</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ҳолати ариза</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                                        </td>
                                    </tr>
                                ) : forms.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <UserCircle className="w-12 h-12 text-slate-600" />
                                                <p>Оилаҳо ёфт нашуданд</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <AnimatePresence mode="wait">
                                        {forms.map((family, idx) => (
                                            <motion.tr
                                                key={family.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ delay: idx * 0.02 }}
                                                onClick={() => router.push(`/dashboard/families/${family.id}`)}
                                                className="hover:bg-white/5 cursor-pointer transition-all group"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
                                                            <UserCircle className="w-5 h-5 text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                                                                {formatFormDisplayName(family) || family.full_name || '—'}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-0.5">
                                                                {family.phone_number || '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium rounded-lg">
                                                        {family.application_purpose || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-lg border ${STATUS_CONFIG[family.status]?.color || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                        {STATUS_CONFIG[family.status]?.label || family.status || '—'}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-950/30">
                            <p className="text-sm text-slate-400">
                                Саҳифа {page} аз {totalPages}
                                {totalCount > 0 && <span className="ml-2 text-slate-500">({totalCount} ҷамъ)</span>}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={!hasPrev && page === 1}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5 text-white" />
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={!hasNext && page >= totalPages}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    );
}
