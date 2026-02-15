'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    DollarSign,
    Search,
    CheckCircle,
    XCircle,
    FileText,
    Calendar,
    ArrowDownToLine,
    CreditCard,
    Loader2,
    Filter,
    Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getForms, createPayment } from '@/services/api';

// --- UTILS ---
const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
        return new Date(dateString).toLocaleDateString('tg-TJ');
    } catch {
        return dateString;
    }
};

const escapeHtml = (text) => {
    if (!text) return '—';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

export default function AccountingPage() {
    const router = useRouter();

    // --- State ---
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0); // 0: All, 1: Unpaid, 2: Paid
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Payment Modal State
    const [paymentModal, setPaymentModal] = useState({ open: false, data: null });
    const [paymentForm, setPaymentForm] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        payment_status: 'paid',
        document_number: '',
        comment: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [tabValue, search, dateFilter]);

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getForms({
                'status__in': ['to_accountant', 'approved']
            });
            setForms(response.data);
        } catch (error) {
            console.error("Failed to fetch accounting data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Filtering ---
    const filteredForms = useMemo(() => {
        return forms.filter(item => {
            // 1. Status/Tab Filter
            if (tabValue === 1) { // Unpaid
                const isPaid = item.payment?.payment_status === 'paid';
                if (isPaid) return false;
            } else if (tabValue === 2) { // Paid
                const isPaid = item.payment?.payment_status === 'paid';
                if (!isPaid) return false;
            }

            // 2. Search Filter
            const searchLower = search.toLowerCase();
            const nameMatch = item.full_name?.toLowerCase().includes(searchLower);
            const idMatch = String(item.id).includes(searchLower);

            if (!nameMatch && !idMatch) return false;

            // 3. Date Filter
            if (dateFilter.from) {
                const itemDate = new Date(item.payment?.payment_date || item.created_at);
                const fromDate = new Date(dateFilter.from);
                if (itemDate < fromDate) return false;
            }
            if (dateFilter.to) {
                const itemDate = new Date(item.payment?.payment_date || item.created_at);
                const toDate = new Date(dateFilter.to);
                toDate.setHours(23, 59, 59);
                if (itemDate > toDate) return false;
            }

            return true;
        });
    }, [forms, tabValue, search, dateFilter]);

    // --- Pagination Logic ---
    const paginatedForms = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredForms.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredForms, currentPage, itemsPerPage]);

    // --- Payment Logic ---
    const handleOpenPayment = (form) => {
        setPaymentModal({ open: true, data: form });
        setPaymentForm({
            payment_date: form.payment?.payment_date || new Date().toISOString().split('T')[0],
            payment_status: form.payment?.payment_status || 'paid',
            document_number: form.payment?.document_number || '',
            comment: form.payment?.comment || ''
        });
    };

    const handleSavePayment = async () => {
        if (!paymentModal.data) return;
        setIsSubmitting(true);
        try {
            const payload = {
                form: paymentModal.data.id,
                ...paymentForm
            };

            await createPayment(payload);

            // Refetch to update list
            await fetchData();
            setPaymentModal({ open: false, data: null });
        } catch (error) {
            console.error("Payment failed", error);
            alert("Payment failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- PDF Export Logic (Adapted from user snippet) ---
    const handleExportToPDF = useCallback((form, e) => {
        e.stopPropagation();

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const poll = form.polls?.[0];
        let pollSection = '';
        if (poll) {
            pollSection = `
                <div class="section">
                    <h2 class="section-title">Маълумоти анкета</h2>
                    <div class="info-row"><div class="info-label">Шумораи аъзоёни оила:</div><div class="info-value">${escapeHtml(poll.family_members)}</div></div>
                    <div class="info-row"><div class="info-label">Вазъи молиявӣ:</div><div class="info-value">${escapeHtml(poll.financial_status)}</div></div>
                    <div class="info-row"><div class="info-label">Сабаби кӯмак:</div><div class="info-value">${escapeHtml(poll.yarim_reason)}</div></div>
                    ${poll.family_workers?.map(w => `<div class="info-row"><div class="info-label">Коргар:</div><div class="info-value">${escapeHtml(w.name)} (${escapeHtml(w.job)}) - ${escapeHtml(w.monthly_income)}c</div></div>`).join('') || ''}
                </div>
            `;
        }

        let documentsSection = '';
        if (form.documents && form.documents.length > 0) {
            documentsSection = `
                <div class="section">
                    <h2 class="section-title">Ҳуҷҷатҳо</h2>
                    ${form.documents.map((doc, idx) => `
                        <div class="info-row" style="flex-direction: column; align-items: flex-start;">
                            <div style="width: 100%; margin-bottom: 10px;">
                                <div class="info-label" style="width: auto; margin-bottom: 5px;">Ҳуҷҷат #${idx + 1}:</div>
                                <div class="info-value">
                                    <strong>${escapeHtml(doc.document_type || '—')}</strong><br>
                                    ${doc.file_name ? escapeHtml(doc.file_name) : '—'}
                                    ${doc.uploaded_at ? `<br><small>Сана: ${formatDate(doc.uploaded_at)}</small>` : ''}
                                </div>
                            </div>
                            ${doc.file_url ? `
                                <div style="width: 100%; margin-top: 10px;">
                                    <img src="${doc.file_url}" 
                                         alt="${escapeHtml(doc.file_name || 'Ҳуҷҷат')}" 
                                         style="max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: block;">
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Маълумоти пардохт - #${form.id}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #1e293b; }
                        .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                        .section { margin-bottom: 30px; }
                        .section-title { color: #3b82f6; font-size: 18px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; }
                        .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
                        .info-label { width: 200px; font-weight: bold; color: #475569; }
                        .info-value { flex: 1; }
                        .amount { color: #10b981; font-weight: bold; font-size: 1.2em; }
                    </style>
                </head>
                <body>
                    <div class="header"><h1>Маълумоти пардохт</h1></div>
                    
                    <div class="section">
                        <h2 class="section-title">Маълумоти аризадиҳанда</h2>
                        <div class="info-row"><div class="info-label">ID:</div><div class="info-value">#${form.id}</div></div>
                        <div class="info-row"><div class="info-label">Ном ва насаб:</div><div class="info-value">${escapeHtml(form.full_name)}</div></div>
                        <div class="info-row"><div class="info-label">Телефон:</div><div class="info-value">${escapeHtml(form.phone_number)}</div></div>
                        <div class="info-row"><div class="info-label">Минтақа:</div><div class="info-value">${escapeHtml(form.address_region)}</div></div>
                    </div>

                    <div class="section">
                        <h2 class="section-title">Тафсилоти пардохт</h2>
                        <div class="info-row"><div class="info-label">Маблағи тасдиқшуда:</div><div class="info-value"><span class="amount">${form.aidmounts?.[0]?.amount || 0} сомонӣ</span></div></div>
                        <div class="info-row"><div class="info-label">Санаи пардохт:</div><div class="info-value">${form.payment?.payment_date || '—'}</div></div>
                        <div class="info-row"><div class="info-label">Статус:</div><div class="info-value">${form.payment?.payment_status === 'paid' ? 'Пардохт шуд' : 'Пардохт нашуд'}</div></div>
                        <div class="info-row"><div class="info-label">№ Ҳуҷҷат:</div><div class="info-value">${escapeHtml(form.payment?.document_number)}</div></div>
                        <div class="info-row"><div class="info-label">Эзоҳ:</div><div class="info-value">${escapeHtml(form.payment?.comment)}</div></div>
                    </div>

                    ${pollSection}

                    ${documentsSection}

                    <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #64748b;">
                        Санаи чоп: ${new Date().toLocaleString('tg-TJ')}
                    </div>
                    <script>window.onload = () => window.print();</script>
                </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }, []);

    // --- Render ---
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // Calculations for stats
    const totalForms = forms.length;
    const paidForms = forms.filter(f => f.payment?.payment_status === 'paid').length;
    const totalAmount = forms.reduce((sum, f) => sum + (parseFloat(f.aidmounts?.[0]?.amount) || 0), 0);
    const paidAmount = forms
        .filter(f => f.payment?.payment_status === 'paid')
        .reduce((sum, f) => sum + (parseFloat(f.aidmounts?.[0]?.amount) || 0), 0);

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-teal-500/10 to-indigo-500/10 rounded-3xl blur-2xl" />
                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl shadow-lg">
                                    <DollarSign className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-teal-100 to-blue-100 bg-clip-text text-transparent">
                                        Бухгалтерия
                                    </h1>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Идоракурии пардохтҳо ва ҳисоботҳо
                                    </p>
                                </div>
                            </div>

                            <button
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white hover:bg-slate-700 hover:border-white/20 transition-all shadow-lg"
                                onClick={() => alert('Excel export coming soon')}
                            >
                                <Download className="w-4 h-4" />
                                Export Excel
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard
                        title="Умумии дархостҳо"
                        value={totalForms}
                        subValue={`${totalAmount.toLocaleString()} с`}
                        icon={FileText}
                        color="text-blue-400"
                    />
                    <StatsCard
                        title="Пардохтшуда"
                        value={paidForms}
                        subValue={`${paidAmount.toLocaleString()} с`}
                        icon={CheckCircle}
                        color="text-emerald-400"
                    />
                    <StatsCard
                        title="Боқимонда"
                        value={totalForms - paidForms}
                        subValue={`${(totalAmount - paidAmount).toLocaleString()} с`}
                        icon={Calendar}
                        color="text-amber-400"
                    />
                </div>

                {/* Main Content (Filters + Table) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden"
                >
                    {/* Tabs */}
                    <div className="border-b border-white/10">
                        <div className="flex p-1 gap-1">
                            {['Ҳама', 'Пардохт нашуд', 'Пардохт шуд'].map((label, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setTabValue(idx)}
                                    className={`flex-1 py-3 text-sm font-medium transition-all relative ${tabValue === idx ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                >
                                    {label}
                                    {tabValue === idx && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-blue-500"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters Toolbar */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 border-b border-white/5 bg-slate-950/30">
                        {/* Search */}
                        <div className="col-span-1 md:col-span-4 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Ҷустуҷӯ (Ном, ID)..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Date Filters */}
                        <div className="col-span-1 md:col-span-3">
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50"
                                value={dateFilter.from}
                                onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1 md:col-span-3">
                            <input
                                type="date"
                                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50"
                                value={dateFilter.to}
                                onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                            />
                        </div>

                        {/* Reset Filter Button */}
                        <div className="col-span-1 md:col-span-2 flex justify-end">
                            <button
                                onClick={() => { setSearch(''); setDateFilter({ from: '', to: '' }); }}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                <Filter className="w-3 h-3" />
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-950/50 border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Аризадиҳанда</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Маблағ</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Сана</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Статус</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Амалҳо</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <AnimatePresence mode="wait">
                                    {paginatedForms.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                Маълумот ёфт нашуд
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedForms.map((item, idx) => (
                                            <motion.tr
                                                key={item.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="hover:bg-white/5 transition-colors group"
                                            >
                                                <td className="px-6 py-4 text-slate-500 font-mono text-sm">#{item.id}</td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-white font-medium hover:text-teal-400 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/applications/${item.id}`)}>
                                                            {item.full_name || 'Номаълум'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{item.phone_number}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-teal-400 font-medium">
                                                    {item.aidmounts?.[0]?.amount ? `${parseFloat(item.aidmounts[0].amount).toLocaleString()} с` : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 text-sm">
                                                    {formatDate(item.payment?.payment_date)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.payment?.payment_status === 'paid' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                                                            <CheckCircle className="w-3 h-3" /> Пардохт шуд
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
                                                            <XCircle className="w-3 h-3" /> Пардохт нашуд
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={(e) => handleExportToPDF(item, e)}
                                                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                                            title="PDF"
                                                        >
                                                            <ArrowDownToLine className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenPayment(item)}
                                                            className="p-2 text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-all"
                                                            title="Edit Payment"
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredForms.length > 0 && (
                        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-slate-950/30">
                            <div className="text-sm text-slate-400">
                                Нишон додани <span className="font-medium text-white">{(currentPage - 1) * itemsPerPage + 1}</span> то <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, filteredForms.length)}</span> аз <span className="font-medium text-white">{filteredForms.length}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm bg-slate-800 border border-white/10 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Қаблӣ
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(filteredForms.length / itemsPerPage) }, (_, i) => i + 1)
                                        .filter(page => page === 1 || page === Math.ceil(filteredForms.length / itemsPerPage) || (page >= currentPage - 1 && page <= currentPage + 1))
                                        .map((page, index, array) => (
                                            <div key={page} className="flex items-center">
                                                {index > 0 && page > array[index - 1] + 1 && <span className="text-slate-500 mx-1">...</span>}
                                                <button
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all ${currentPage === page ? 'bg-teal-500 text-white font-bold' : 'bg-slate-800 border border-white/10 text-slate-400 hover:bg-slate-700'}`}
                                                >
                                                    {page}
                                                </button>
                                            </div>
                                        ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredForms.length / itemsPerPage)))}
                                    disabled={currentPage === Math.ceil(filteredForms.length / itemsPerPage)}
                                    className="px-3 py-1 text-sm bg-slate-800 border border-white/10 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Баъдӣ
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {paymentModal.open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPaymentModal({ open: false, data: null })}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                        >
                            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-blue-500/5" /> {/* Updated gradient */}

                                <div className="flex items-center justify-between mb-6 relative z-10">
                                    <h2 className="text-xl font-bold text-white">Сабти пардохт</h2>
                                    <button onClick={() => setPaymentModal({ open: false, data: null })} className="text-slate-400 hover:text-white">
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <p className="text-sm text-slate-400">Аризадиҳанда</p>
                                        <p className="text-lg font-medium text-white">{paymentModal.data?.full_name}</p>
                                        <p className="text-teal-400 font-bold mt-1">
                                            {paymentModal.data?.aidmounts?.[0]?.amount ? `${paymentModal.data.aidmounts[0].amount} сомонӣ` : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-400 uppercase mb-2 block">Санаи пардохт</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                            value={paymentForm.payment_date}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-400 uppercase mb-2 block">Статус</label>
                                        <select
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                            value={paymentForm.payment_status}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_status: e.target.value })}
                                        >
                                            <option value="paid">Пардохт шуд</option>
                                            <option value="unpaid">Пардохт нашуд</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-400 uppercase mb-2 block">Рақами ҳуҷҷат</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                            placeholder="№ ҳуҷҷат"
                                            value={paymentForm.document_number}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, document_number: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-slate-400 uppercase mb-2 block">Эзоҳ</label>
                                        <textarea
                                            rows={2}
                                            className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                                            placeholder="..."
                                            value={paymentForm.comment}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, comment: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        onClick={handleSavePayment}
                                        disabled={isSubmitting}
                                        className="w-full py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Сабт кардан'}
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

function StatsCard({ title, value, subValue, icon: Icon, color }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group"
        >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-xl group-hover:opacity-20 transition-all ${color.replace('text-', 'bg-')}`} />

            <div className="flex justify-between items-start relative">
                <div>
                    <p className="text-slate-400 text-sm font-medium">{title}</p>
                    <h3 className="text-3xl font-bold text-white mt-2">{value}</h3>
                    {subValue && <p className={`text-sm font-medium mt-1 ${color}`}>{subValue}</p>}
                </div>
                <div className={`p-3 rounded-xl bg-white/5 border border-white/5 ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </motion.div>
    );
}
