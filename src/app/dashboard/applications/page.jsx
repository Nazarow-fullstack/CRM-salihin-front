'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Plus,
    Download,
    ChevronRight,
    X,
    Loader2,
    Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import api from '@/lib/axios';

// --- CONFIGURATION ---
const STATUS_CONFIG = {
    new_message: { label: 'Паёми нав', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
    submitted: { label: 'Пуркардани анкета', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
    under_review: { label: 'Кумита', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
    to_accountant: { label: 'Бухгалтерия', color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400' },
    rejected: { label: 'Рад', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
    approved: { label: 'Кумакшуда', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
    family_video: { label: 'Видеои', color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400' },
    help_later: { label: 'Баъдтар', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
    bank_card: { label: 'Ҳуҷҷат', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
    deleted: { label: 'Удалит', color: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-500' },
};

const REGIONS = ['НТМ', 'ХАТЛОН', 'СУҒД', 'ВМКБ', 'БЕРУН АЗ ТҶК'];
const PURPOSES = ['Пешниҳод дорам', 'Кӯмак лозим'];
const YARIM_REASON_OPTIONS = [
    { value: 'Табобат', label: 'Табобат' },
    { value: 'Таҳсилот', label: 'Таҳсилот' },
    { value: 'Хӯрок', label: 'Хӯрок' },
    { value: 'Таъмири хона', label: 'Таъмири хона' },
    { value: 'Дастгирии тиҷорат', label: 'Дастгирии тиҷорат' },
    { value: 'Ниёзи аввали', label: 'Ниёзи аввали' },
];
const ITEMS_PER_PAGE = 10;

export default function ApplicationsPage() {
    const router = useRouter();
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [regionFilter, setRegionFilter] = useState('all');
    const [purposeFilter, setPurposeFilter] = useState('all');
    const [yarimReasonFilter, setYarimReasonFilter] = useState('all');

    // Pagination & Modal
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Application State
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        application_purpose: '',
        address_region: '',
        detailed_address: '',
        description: ''
    });

    // 1. DATA FETCHING
    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/forms/');
            setForms(response.data);
        } catch (error) {
            console.error("Failed to fetch forms", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 2. EXPORT LOGIC (Excel - filtered data)
    const handleExport = () => {
        if (filteredData.length === 0) return;

        const headers = [
            'Фио',
            'Номер телефон',
            'Мақсади ариза',
            'Санаи воридшуда',
            'Минтақа',
            'Суроға',
            'Матни ариза',
            'Статус (вазъият)',
            'Аъзои оила',
            'Санаи таваллуд',
            'Ҷойи кор',
            'Музди маош',
            'Вазъи оилавӣ',
            'Мақсади кумак',
        ];
        const poll = (f) => f.polls?.[0];
        const rows = filteredData.map(f => [
            f.full_name ?? '',
            f.phone_number ?? '',
            f.application_purpose ?? '',
            f.created_at ? new Date(f.created_at).toLocaleDateString() : '',
            f.address_region ?? '',
            f.detailed_address ?? '',
            f.description ?? '',
            STATUS_CONFIG[f.status]?.label ?? f.status ?? '',
            poll(f)?.family_members ?? '',
            poll(f)?.data_of_birth ? new Date(poll(f).data_of_birth).toLocaleDateString() : '',
            poll(f)?.profession_jobs ?? '',
            poll(f)?.monthly_income ?? '',
            poll(f)?.financial_status ?? '',
            poll(f)?.yarim_reason ?? '',
        ]);

        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Дархостҳо');
        const fileName = `applications_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // 3. CREATE APPLICATION LOGIC
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/forms/', formData);
            setIsModalOpen(false);
            setFormData({
                full_name: '',
                phone_number: '',
                application_purpose: '',
                address_region: '',
                detailed_address: '',
                description: ''
            });
            fetchData(); // Refresh list
        } catch (error) {
            console.error("Failed to create application", error);
            alert("Error creating application. Please check the fields.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 4. FILTERING LOGIC
    const filteredData = useMemo(() => {
        return forms.filter(item => {
            const searchLower = search.toLowerCase();
            const nameMatch = item.full_name?.toLowerCase().includes(searchLower);
            const phoneMatch = item.phone_number?.includes(searchLower);
            const statusMatch = statusFilter === 'all' || item.status === statusFilter;
            const regionMatch = regionFilter === 'all' || item.address_region === regionFilter;
            const purposeMatch = purposeFilter === 'all' || item.application_purpose === purposeFilter;
            const yarimMatch = yarimReasonFilter === 'all' || item.polls?.[0]?.yarim_reason === yarimReasonFilter;

            return (nameMatch || phoneMatch) && statusMatch && regionMatch && purposeMatch && yarimMatch;
        });
    }, [forms, search, statusFilter, regionFilter, purposeFilter, yarimReasonFilter]);

    // 5. PAGINATION LOGIC
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, regionFilter, purposeFilter, yarimReasonFilter]);

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-black ">
                     Дархостҳо
                    </h1>
                    <p className="text-gray-900">
                     Дархостҳои кӯмак ва пешниҳодҳо
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-purple-500/20 transition-all hover:scale-[1.02]"
                    >
                        <Plus className="w-4 h-4" /> Дархости Нав
                    </button>
                </div>
            </div>

            {/* FILTERS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Ном ё телефонро ҷустуҷӯ кунед..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Ҳама (вазъият)</option>
                    {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                        <option key={key} value={key}>{conf.label}</option>
                    ))}
                </select>
                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                >
                    <option value="all">Ҳамаи минтақаҳо</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
                    value={purposeFilter}
                    onChange={(e) => setPurposeFilter(e.target.value)}
                >
                    <option value="all">Мақсади ариза</option>
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
                    value={yarimReasonFilter}
                    onChange={(e) => setYarimReasonFilter(e.target.value)}
                >
                    <option value="all">Мақсади кӯмак (ҳама)</option>
                    {YARIM_REASON_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* TABLE */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4 font-semibold">ID</th>
                                <th className="px-6 py-4 font-semibold">Ном ва насаб</th>
                                <th className="px-6 py-4 font-semibold">Мақсади ариза</th>
                                <th className="px-6 py-4 font-semibold">Минтақа</th>
                                <th className="px-6 py-4 font-semibold">Санаи иловашуда</th>
                                <th className="px-6 py-4 font-semibold">Статус</th>
                                <th className="px-6 py-4 font-semibold text-right">Амал</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
                                    </td>
                                </tr>
                            ) : paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                     Приложения, соответствующие вашим фильтрам, не найдены.
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => router.push(`/dashboard/applications/${item.id}`)}
                                        className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-500">#{item.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">{item.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{item.phone_number}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{item.application_purpose || '-'}</td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{item.address_region || '-'}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[item.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                                                {STATUS_CONFIG[item.status]?.label || item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-purple-600 transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                {filteredData.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-medium text-slate-900 dark:text-slate-100">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-slate-900 dark:text-slate-100">{Math.min(page * ITEMS_PER_PAGE, filteredData.length)}</span> of <span className="font-medium text-slate-900 dark:text-slate-100">{filteredData.length}</span> results
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* NEW APPLICATION MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                        >
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Дархости Нав</h2>
                                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Ном ва насаб</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.full_name}
                                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Рақами телефон</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.phone_number}
                                                onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Мақсад ариза</label>
                                            <select
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.application_purpose}
                                                onChange={e => setFormData({ ...formData, application_purpose: e.target.value })}
                                            >
                                                <option value="">Интихоб кунед</option>
                                                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Минтақа</label>
                                            <select
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.address_region}
                                                onChange={e => setFormData({ ...formData, address_region: e.target.value })}
                                            >
                                                <option value="">Интихоб кунед</option>
                                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase">Суроғаи муфассал</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                            value={formData.detailed_address}
                                            onChange={e => setFormData({ ...formData, detailed_address: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase">Матни ариза</label>
                                        <textarea
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Илова кардан</>}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}