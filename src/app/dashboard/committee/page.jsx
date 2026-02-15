'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Gavel,
    Search,
    CheckCircle,
    XCircle,
    DollarSign,
    Calendar,
    User,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Users,
    FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';

// --- CONFIGURATION ---
const REGIONS = ['НТМ', 'ХАТЛОН', 'СУҒД', 'ВМКБ', 'БЕРУН АЗ ТҶК'];
const ITEMS_PER_PAGE = 10;

export default function CommitteePage() {
    const router = useRouter();

    // --- State ---
    const [forms, setForms] = useState([]);
    const [pollReasons, setPollReasons] = useState({}); // { [formId]: reason }
    const [loading, setLoading] = useState(true);

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [regionFilter, setRegionFilter] = useState('all');

    // Voting Logic
    const [voting, setVoting] = useState(null); // { id, type, comment, amount } or null
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Data Fetching ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Forms
            const response = await api.get('/forms/', { params: { status: 'under_review' } });
            const formsData = response.data;
            setForms(formsData);

            // 2. Fetch Polls for Reasons (Parallel)
            if (formsData.length > 0) {
                const pollPromises = formsData.map(form =>
                    api.get('/polls/', { params: { form_id: form.id } })
                        .then(res => ({ formId: form.id, data: res.data }))
                        .catch(() => ({ formId: form.id, data: [] }))
                );

                const results = await Promise.allSettled(pollPromises);

                const newPollReasons = {};
                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        const { formId, data } = result.value;
                        if (data && data.length > 0) {
                            newPollReasons[formId] = data[0].yarim_reason || 'Сабаб нест';
                        } else {
                            newPollReasons[formId] = 'Маълумот нест';
                        }
                    }
                });
                setPollReasons(newPollReasons);
            }
        } catch (error) {
            console.error("Failed to fetch committee data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Filter Logic ---
    const filteredForms = useMemo(() => {
        return forms.filter(item => {
            const searchLower = search.toLowerCase();
            const nameMatch = item.full_name?.toLowerCase().includes(searchLower);
            const phoneMatch = item.phone_number?.includes(searchLower);
            const regionMatch = regionFilter === 'all' || item.address_region === regionFilter;

            return (nameMatch || phoneMatch) && regionMatch;
        });
    }, [forms, search, regionFilter]);

    // PAGINATION
    const totalPages = Math.ceil(filteredForms.length / ITEMS_PER_PAGE);
    const paginatedForms = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredForms.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredForms, page]);

    useEffect(() => {
        setPage(1);
    }, [search, regionFilter]);

    // --- Voting Actions ---
    const openVoteModal = (e, item) => {
        e.stopPropagation(); // Prevent row click navigation
        setVoting({
            id: item.id,
            type: 'approved',
            comment: '',
            amount: ''
        });
    };

    const submitVote = async () => {
        if (!voting) return;
        setIsSubmitting(true);
        try {
            // 1. Post Note
            const noteText = `Vote: ${voting.type.toUpperCase()}${voting.comment ? ` - ${voting.comment}` : ''}`;
            await api.post('/form-notes/', {
                form: voting.id,
                note: noteText
            });

            // 2. Patch Form Status with Payload Fix
            const payload = {
                status: voting.type
            };

            // Fix for 500 Error: Send Amount as Array of Objects (Nested Serializer)
            if (voting.type === 'to_accountant' && voting.amount) {
                payload.aidmounts = [{ amount: parseFloat(voting.amount) }];
            }

            await api.patch(`/forms/${voting.id}/`, payload);

            // 3. Refresh
            setVoting(null);
            fetchData();
        } catch (error) {
            console.error("Failed to submit vote", error);
            if (error.response) {
                console.error("Error response data:", error.response.data);
                alert(`Failed to submit vote: ${JSON.stringify(error.response.data)}`);
            } else {
                alert("Failed to submit vote. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Navigation ---
    const handleRowClick = (id) => {
        router.push(`/dashboard/applications/${id}`);
    };

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

                {/* HEADER - Matching Families Page Design */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 rounded-3xl blur-2xl" />
                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg">
                                    <Gavel className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-purple-100 to-blue-100 bg-clip-text text-transparent">
                                        Баррасии Кумита
                                    </h1>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {filteredForms.length} {filteredForms.length === 1 ? 'ариза' : 'аризаҳо'} дар баррасӣ
                                    </p>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="flex gap-4">
                                <select
                                    className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    value={regionFilter}
                                    onChange={(e) => setRegionFilter(e.target.value)}
                                >
                                    <option value="all">Ҳама минтақаҳо</option>
                                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <div className="relative group max-w-xs">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Ҷустуҷӯ..."
                                        className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 gap-6">

                    {/* Stats Section - Quick View */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatsCard
                            title="Дар баррасӣ"
                            value={forms.length}
                            icon={Gavel}
                            color="text-purple-400"
                        />
                        <StatsCard
                            title="Имрӯз воридшуда"
                            value={forms.filter(f => new Date(f.created_at).toDateString() === new Date().toDateString()).length}
                            icon={Calendar}
                            color="text-blue-400"
                        />
                        <StatsCard
                            title="Минтақаҳо"
                            value={[...new Set(forms.map(f => f.address_region))].length}
                            icon={Users}
                            color="text-emerald-400"
                        />
                    </div>

                    {/* Table Section - Matching Families Page Design */}
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
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Аризадиҳанда</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Сабаб (Poll)</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Минтақа</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Сана</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Амалҳо</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <AnimatePresence mode="wait">
                                        {paginatedForms.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <FileText className="w-12 h-12 text-slate-600" />
                                                        <p>Аризаҳо ёфт нашуданд</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedForms.map((item, idx) => (
                                                <motion.tr
                                                    key={item.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="hover:bg-white/5 transition-all group cursor-pointer"
                                                    onClick={() => handleRowClick(item.id)}
                                                >
                                                    <td className="px-6 py-4 text-slate-500 font-mono text-sm">#{item.id}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                                                                <User className="w-5 h-5 text-slate-400" />
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-medium group-hover:text-purple-400 transition-colors">
                                                                    {item.full_name || 'Номаълум'}
                                                                </p>
                                                                <p className="text-xs text-slate-500">{item.phone_number}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="max-w-[200px] truncate text-slate-300 text-sm" title={pollReasons[item.id]}>
                                                            {pollReasons[item.id] || <span className="text-slate-500 italic">...</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex px-2.5 py-1 bg-slate-800 border border-white/5 rounded-md text-slate-300 text-xs font-medium">
                                                            {item.address_region || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-sm">
                                                        {new Date(item.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">

                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-950/30">
                                <p className="text-sm text-slate-400">
                                    Саҳифа {page} аз {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-white" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
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

            {/* Review Modal - Glassmorphism */}
            <AnimatePresence>
                {voting && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setVoting(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                        >
                            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5" />

                                <div className="relative">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                                <Gavel className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Қарори Кумита</h2>
                                                <p className="text-xs text-slate-400">Ариза #{voting.id}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setVoting(null)} className="text-slate-400 hover:text-white transition-colors">
                                            <XCircle className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        {/* Decision Selector */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                onClick={() => setVoting({ ...voting, type: 'approved' })}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${voting.type === 'approved'
                                                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                    : 'border-white/10 hover:bg-white/5 text-slate-400 hover:text-white'
                                                    }`}
                                            >
                                                <CheckCircle className="w-6 h-6" />
                                                <span className="text-xs font-bold">Тасдиқ</span>
                                            </button>

                                            <button
                                                onClick={() => setVoting({ ...voting, type: 'rejected' })}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${voting.type === 'rejected'
                                                    ? 'border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                                    : 'border-white/10 hover:bg-white/5 text-slate-400 hover:text-white'
                                                    }`}
                                            >
                                                <XCircle className="w-6 h-6" />
                                                <span className="text-xs font-bold">Рад кардан</span>
                                            </button>

                                            <button
                                                onClick={() => setVoting({ ...voting, type: 'to_accountant' })}
                                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${voting.type === 'to_accountant'
                                                    ? 'border-teal-500/50 bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                                                    : 'border-white/10 hover:bg-white/5 text-slate-400 hover:text-white'
                                                    }`}
                                            >
                                                <DollarSign className="w-6 h-6" />
                                                <span className="text-xs font-bold">Бухгалтер</span>
                                            </button>
                                        </div>

                                        {/* Amount Input (Conditional) */}
                                        <AnimatePresence>
                                            {voting.type === 'to_accountant' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <label className="text-xs font-medium text-slate-400 uppercase mb-2 block">Маблағи тасдиқшуда</label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                                        <input
                                                            type="number"
                                                            placeholder="0.00"
                                                            className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-white"
                                                            value={voting.amount}
                                                            onChange={(e) => setVoting({ ...voting, amount: e.target.value })}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Comment */}
                                        <div>
                                            <label className="text-xs font-medium text-slate-400 uppercase mb-2 block">Шарҳи Кумита</label>
                                            <textarea
                                                rows={3}
                                                placeholder="Сабаби қарорро нависед..."
                                                className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-sm text-white placeholder-slate-600"
                                                value={voting.comment}
                                                onChange={(e) => setVoting({ ...voting, comment: e.target.value })}
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-4 pt-4">
                                            <button
                                                onClick={() => setVoting(null)}
                                                className="flex-1 px-4 py-3 border border-white/10 rounded-xl text-slate-300 font-medium hover:bg-white/5 transition-colors"
                                            >
                                                Бекор кардан
                                            </button>
                                            <button
                                                onClick={submitVote}
                                                disabled={isSubmitting || (voting.type === 'to_accountant' && !voting.amount)}
                                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl shadow-lg hover:shadow-purple-500/25 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Тасдиқ кардан'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color }) {
    return (
        <Card className="border border-white/10 bg-slate-900 backdrop-blur-xl shadow-xl hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-400">{title}</p>
                        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
                    </div>
                    <div className={`h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 ${color}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
