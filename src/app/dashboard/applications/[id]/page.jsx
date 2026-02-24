'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    User, Phone, MapPin, Calendar, FileText,
    ArrowLeft, Edit, CreditCard, Check, X,
    Plus, Trash2, Clock, AlertCircle, Loader2,
    Send, Briefcase, Users, DollarSign, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import useAuthStore from '@/store/useAuthStore';
import api from '@/lib/axios';
import { EditFormDialog, EditPollDialog } from '@/components/EditDialogs';

// Status Constants
const STATUS_LABELS = {
    new_message: 'Паёми нав',
    submitted: 'Пуркардани анкета',
    under_review: 'Кумита',
    to_accountant: 'Бухгалтерия',
    rejected: 'Рад',
    approved: 'Кумакшуда',
    family_video: 'Видеои',
    help_later: 'Баъдтар',
    bank_card: 'Ҳуҷҷат',
    deleted: 'Удалит',
};

const STATUS_COLORS = {
    new_message: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    submitted: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    under_review: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    to_accountant: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
    approved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    family_video: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
    help_later: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    bank_card: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    deleted: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
};

// Transition Logic (Ported)
const STATUS_TRANSITIONS = {
    operator: {
        new_message: ['submitted', 'under_review', 'rejected', 'help_later', 'deleted'],
        submitted: ['under_review', 'rejected', 'help_later', 'family_video'],
        under_review: [],
        rejected: ['submitted', 'under_review', 'help_later'],
        help_later: ['submitted', 'under_review', 'rejected'],
        family_video: [],
        to_accountant: [],
        approved: [],
        bank_card: ['to_accountant'],
        deleted: [],
    },
    reviewer: {
        new_message: ['submitted', 'under_review', 'rejected', 'help_later', 'deleted'],
        submitted: ['under_review', 'rejected', 'help_later', 'family_video'],
        under_review: ['family_video', 'rejected', 'help_later', 'submitted', 'to_accountant', 'bank_card'],
        rejected: ['submitted', 'under_review', 'help_later'],
        help_later: ['submitted', 'under_review', 'rejected'],
        family_video: ['submitted', 'rejected', 'to_accountant'],
        to_accountant: [],
        approved: [],
        bank_card: [],
        deleted: [],
    },
    accountant: {
        family_video: ['approved', 'rejected'],
        approved: ['rejected'],
        submitted: [],
        rejected: [],
        help_later: [],
        new_message: [],
        under_review: [],
        to_accountant: ['rejected', 'bank_card', 'approved'],
        bank_card: ['approved', 'rejected'],
        deleted: [],
    },
    superuser: {
        new_message: ['submitted', 'under_review', 'rejected', 'help_later', 'to_accountant', 'family_video', 'bank_card', 'approved', 'deleted'],
        submitted: ['new_message', 'under_review', 'rejected', 'help_later', 'to_accountant', 'family_video', 'bank_card', 'approved', 'deleted'],
        under_review: ['new_message', 'submitted', 'rejected', 'help_later', 'to_accountant', 'family_video', 'bank_card', 'approved', 'deleted'],
        rejected: ['new_message', 'submitted', 'under_review', 'help_later', 'to_accountant', 'family_video', 'bank_card', 'approved', 'deleted'],
        help_later: ['new_message', 'submitted', 'under_review', 'rejected', 'to_accountant', 'family_video', 'bank_card', 'approved', 'deleted'],
        family_video: ['new_message', 'submitted', 'under_review', 'rejected', 'help_later', 'to_accountant', 'bank_card', 'approved', 'deleted'],
        to_accountant: ['new_message', 'submitted', 'under_review', 'rejected', 'help_later', 'family_video', 'bank_card', 'approved', 'deleted'],
        bank_card: ['new_message', 'submitted', 'under_review', 'rejected', 'help_later', 'to_accountant', 'family_video', 'approved', 'deleted'],
        approved: ['new_message', 'submitted', 'under_review', 'rejected', 'help_later', 'to_accountant', 'family_video', 'bank_card', 'deleted'],
        deleted: ['new_message', 'submitted', 'under_review', 'rejected', 'help_later', 'to_accountant', 'family_video', 'bank_card', 'approved'],
    },
};

export default function ApplicationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const id = params.id;

    // State
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [relatedForms, setRelatedForms] = useState([]);
    const [poll, setPoll] = useState(null);

    // Notes
    const [newNote, setNewNote] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    // Edit Dialogs
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [isEditPollOpen, setIsEditPollOpen] = useState(false);

    // To Accountant: ask amount when under_review → to_accountant
    const [amountModalOpen, setAmountModalOpen] = useState(false);
    const [amountForAccountant, setAmountForAccountant] = useState('');
    const [amountSubmitting, setAmountSubmitting] = useState(false);

    // Fetch Data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [formRes, historyRes, relatedRes] = await Promise.all([
                api.get(`/forms/${id}/`),
                api.get(`/forms/${id}/history/`).catch(() => ({ data: [] })),
                api.get(`/forms/${id}/related_forms/`).catch(() => ({ data: [] }))
            ]);

            setForm(formRes.data);
            setHistory(historyRes.data);
            setRelatedForms(relatedRes.data);

            if (formRes.data.polls && formRes.data.polls.length > 0) {
                setPoll(formRes.data.polls[0]);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load application details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchData();
    }, [id, fetchData]);

    // Handle Status Change
    const handleStatusChange = async (newStatus) => {
        try {
            await api.patch(`/forms/${id}/`, { status: newStatus });
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    // When user selects to_accountant from dropdown: if currently under_review, show amount modal first
    const handleStatusSelect = (newStatus) => {
        if (newStatus === 'to_accountant' && form?.status === 'under_review') {
            setAmountForAccountant(form.aidmounts?.[0]?.amount?.toString() || '');
            setAmountModalOpen(true);
            return;
        }
        handleStatusChange(newStatus);
    };

    const handleConfirmAmountToAccountant = async () => {
        const amount = parseFloat(amountForAccountant);
        if (!amountModalOpen || isNaN(amount) || amount <= 0) {
            alert('Маблағи кӯмакро дохил кунед');
            return;
        }
        setAmountSubmitting(true);
        try {
            await api.patch(`/forms/${id}/`, {
                status: 'to_accountant',
                approved_amount: amount,
                aidmounts: [{ amount }]
            });
            setAmountModalOpen(false);
            setAmountForAccountant('');
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Хатогӣ: вазъият ва маблағ сабт нашуд');
        } finally {
            setAmountSubmitting(false);
        }
    };

    // Handle Note Submit
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            setIsSubmittingNote(true);
            const optimisticNote = {
                id: Date.now(),
                note: newNote,
                user_username: user?.username || 'You',
                created_at: new Date().toISOString()
            };

            setForm(prev => ({
                ...prev,
                notes: [...(prev.notes || []), optimisticNote]
            }));
            setNewNote('');

            await api.post('/form-notes/', { form: id, note: newNote });
        } catch (err) {
            console.error(err);
            alert('Failed to add note');
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const allowedStatuses = useMemo(() => {
        if (!user || !form) return [];
        const role = user.role || 'superuser';
        return STATUS_TRANSITIONS[role]?.[form.status] || [];
    }, [user, form]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!form) return <div className="p-8 text-center text-slate-400">Application not found</div>;

    return (
        <div className="min-h-screen ">
            <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                {/* Enhanced Header with Gradient */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 rounded-3xl blur-2xl" />
                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => router.back()}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105"
                                >
                                    <ArrowLeft className="w-5 h-5 text-white" />
                                </button>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                                    Маълумоти оила
                                    </h1>
                                    <p className="text-sm text-slate-400 mt-1">ID: <span className="text-blue-400 font-mono">#{form.id}</span></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                {form.status === 'submitted' && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditPollOpen(true)}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white border border-blue-400/30 shadow-lg transition-all flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Анкетро пур кунед
                                    </button>
                                )}
                                <span className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-semibold uppercase border shadow-lg",
                                    STATUS_COLORS[form.status] || "text-gray-400 border-gray-400/20"
                                )}>
                                    {STATUS_LABELS[form.status] || form.status}
                                </span>
                                {allowedStatuses.length > 0 && (
                                    <select
                                        className="bg-slate-800 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-lg"
                                        onChange={(e) => handleStatusSelect(e.target.value)}
                                        value=""
                                    >
                                        <option value="" disabled>Тағйири вазъият..</option>
                                        {allowedStatuses.map(status => (
                                            <option key={status} value={status}>
                                                {STATUS_LABELS[status]}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content (Left Col) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Applicant Info Card - Enhanced */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-500/10 rounded-xl">
                                        <User className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-white">{form.full_name}</h2>
                                </div>
                                <button
                                    onClick={() => setIsEditFormOpen(true)}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 transition-all hover:bg-blue-500/20"
                                >
                                    <Edit className="w-3 h-3" /> ислоҳ
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    
                                    <div className="space-y-2">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Рақами телефонr</span>
                                        <div className="text-white font-semibold text-lg flex items-center gap-2">
                                            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                            </div>
                                            {form.phone_number}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Минтақа</span>
                                        <div className="text-white font-semibold flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-500/10 rounded-lg">
                                                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                                            </div>
                                            {form.address_region}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Санаи воридшуда</span>
                                        <div className="text-white font-semibold flex items-center gap-2">
                                            <div className="p-1.5 bg-orange-500/10 rounded-lg">
                                                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                                            </div>
                                            {new Date(form.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Суроға</span>
                                        <p className="text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5">{form.detailed_address || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Application Content Card - Enhanced */}
                        <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-500/10 rounded-xl">
                                    <FileText className="w-5 h-5 text-purple-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Мақсади ариза</h2>
                            </div>

                            {(parseFloat(form.aidmounts?.[0]?.amount) > 0 || parseFloat(form.approved_amount) > 0) && (
                                <div className="mb-6 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-2xl" />
                                    <div className="relative bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-lg">
                                        <span className="text-xs text-emerald-300 uppercase tracking-wider font-bold">Маблағи дархостшуда</span>
                                        <p className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mt-2">
                                            {parseFloat(form.aidmounts?.[0]?.amount || form.approved_amount || 0)} <span className="text-2xl">TJS</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-5">
                                <div>
                                    <p className="text-white mt-2 text-lg font-medium">{form.application_purpose || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Матни ариза</span>
                                    <div className="mt-2 p-5 bg-slate-950/50 rounded-xl border border-white/10 text-slate-300 leading-relaxed whitespace-pre-wrap shadow-inner">
                                        {form.description}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Poll / Anketa Data - Enhanced */}
                        {poll && (
                            <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-xl">
                                            <Briefcase className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-white">Маълумоти анкета</h2>
                                    </div>
                                    <button
                                        onClick={() => setIsEditPollOpen(true)}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 transition-all hover:bg-blue-500/20"
                                    >
                                        <Edit className="w-3 h-3" /> Edit
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                                    <div className="p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl border border-white/5">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Аъзои оила</span>
                                        <p className="text-white font-bold text-2xl mt-2 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-blue-400" />
                                            {poll.family_members}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl border border-white/5">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Санаи таваллуд</span>
                                        <p className="text-white font-bold text-2xl mt-2 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-emerald-400" />
                                            {poll.data_of_birth}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-xl border border-white/5">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Маъоши моҳона</span>
                                        <p className="text-white font-bold text-2xl mt-2 flex items-center gap-2">
                                            <DollarSign className="w-5 h-5 text-emerald-400" />
                                            {poll.monthly_income} <span className="text-lg text-slate-400">TJS</span>
                                        </p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Кор / Касб</span>
                                        <p className="text-white font-semibold mt-2">{poll.profession_jobs}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 md:col-span-2">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Мақсади кӯмак</span>
                                        <p className="text-white font-semibold mt-2">{poll.yarim_reason}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 md:col-span-2">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Вазъи молиявӣ</span>
                                        <p className="text-white font-semibold mt-2">{poll.financial_status}</p>
                                    </div>
                                </div>

                                {poll.family_workers?.length > 0 && (
                                    <div className="overflow-hidden rounded-xl border border-white/10">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Job</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Income</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {poll.family_workers.map((worker, i) => (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-3 text-white font-medium">{worker.name}</td>
                                                        <td className="px-4 py-3 text-slate-300">{worker.job}</td>
                                                        <td className="px-4 py-3 text-slate-300">{worker.monthly_income}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Documents Section - Enhanced */}
                        {form.documents && form.documents.length > 0 && (
                            <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-500/10 rounded-xl">
                                        <FileText className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-white">Documents & Photos</h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {form.documents.map((doc, idx) => (
                                        <div
                                            key={doc.id}
                                            className="group relative aspect-square rounded-xl overflow-hidden border-2 border-white/10 hover:border-blue-500/50 transition-all cursor-pointer shadow-lg hover:shadow-2xl hover:scale-105"
                                            onClick={() => window.open(doc.file_url, '_blank')}
                                        >
                                            <img
                                                src={doc.file_url}
                                                alt={`Document ${idx + 1}`}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                                <span className="text-white font-semibold text-sm px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                                                    View Full Size
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Content (Right Col) - Enhanced */}
                    <div className="space-y-6">

                        {/* Notes Section - Enhanced */}
                        <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col h-[600px] shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Шарҳ мондан</h2>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}>
                                {history.map((item, i) => (
                                    <div key={`hist-${i}`} className="flex gap-3 text-sm">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shrink-0">
                                            <Activity className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white">
                                                Status changed to <span className="font-semibold text-blue-400">{STATUS_LABELS[item.new_status] || item.new_status}</span>
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                by <span className="text-slate-400 font-medium">{item.user}</span> • {new Date(item.changed_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {form.notes?.map((note, i) => (
                                    <div key={note.id || i} className="flex gap-3 text-sm">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="flex-1 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl border border-white/10 p-4 shadow-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-blue-300">{note.user_username}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">{new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-slate-200 leading-relaxed">{note.note}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input Area - Enhanced */}
                            <form onSubmit={handleAddNote} className="relative">
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Write a note..."
                                    className="w-full bg-slate-950/50 border border-white/20 rounded-xl pl-4 pr-14 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-lg"
                                />
                                <button
                                    type="submit"
                                    disabled={!newNote.trim() || isSubmittingNote}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:hover:shadow-lg hover:scale-105"
                                >
                                    {isSubmittingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>

                        {/* Document Upload Section - Enhanced */}
                        <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">
                             Ҳуҷҷатҳо
                            </h2>
                            <div className="space-y-3">
                                <label className="block">
                                    <input type="file" multiple accept="image/*" className="hidden"
                                        onChange={async (e) => {
                                            const files = e.target.files;
                                            if (!files || files.length === 0) return;
                                            try {
                                                for (const file of Array.from(files)) {
                                                    const formData = new FormData();
                                                    formData.append('file', file);
                                                    formData.append('document_type', 'passport');
                                                    formData.append('form', id);
                                                    await api.post('/documents/', formData, {
                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                    });
                                                }
                                                fetchData();
                                            } catch (err) {
                                                console.error(err);
                                                alert('Failed to upload document');
                                            }
                                        }}
                                    />
                                    <div className="flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border border-blue-500/30 rounded-xl cursor-pointer transition-all group shadow-lg hover:shadow-xl hover:scale-105">
                                        <FileText className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm text-blue-400 font-semibold">Паспорт</span>
                                    </div>
                                </label>

                                <label className="block">
                                    <input type="file" multiple accept="image/*" className="hidden"
                                        onChange={async (e) => {
                                            const files = e.target.files;
                                            if (!files || files.length === 0) return;
                                            try {
                                                for (const file of Array.from(files)) {
                                                    const formData = new FormData();
                                                    formData.append('file', file);
                                                    formData.append('document_type', 'other');
                                                    formData.append('form', id);
                                                    await api.post('/documents/', formData, {
                                                        headers: { 'Content-Type': 'multipart/form-data' }
                                                    });
                                                }
                                                fetchData();
                                            } catch (err) {
                                                console.error(err);
                                                alert('Failed to upload document');
                                            }
                                        }}
                                    />
                                    <div className="flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 rounded-xl cursor-pointer transition-all group shadow-lg hover:shadow-xl hover:scale-105">
                                        <FileText className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm text-emerald-400 font-semibold">Дигар ҳуҷҷатҳо</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Related Forms - Enhanced */}
                        {relatedForms.length > 0 && (
                            <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                                <h2 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">
                                    Муроҷиатҳо ({relatedForms.length})
                                </h2>
                                <div className="space-y-3">
                                    {relatedForms.map(rForm => (
                                        <Link
                                            key={rForm.id}
                                            href={`/dashboard/applications/${rForm.id}`}
                                            className="block p-4 rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 border border-white/10 hover:border-blue-500/30 transition-all group shadow-lg hover:shadow-xl hover:scale-105"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                        {rForm.full_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 font-medium">
                                                        ID: <span className="text-blue-400">#{rForm.id}</span> • {new Date(rForm.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">статус: {STATUS_LABELS[rForm.status] || rForm.status}</p>
                                                </div>
                                                <span className={cn(
                                                    "w-3 h-3 rounded-full shadow-lg",
                                                    STATUS_COLORS[rForm.status]?.split(' ')[1]?.replace('/10', '') || "bg-gray-400"
                                                )} />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Modal: Yardım miktarı (under_review → to_accountant) */}
            {amountModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10 overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Маблағи кӯмак</h3>
                            <button
                                type="button"
                                onClick={() => { setAmountModalOpen(false); setAmountForAccountant(''); }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-400">Вазъият ба «Бухгалтерия» иваз мешавад. Маблағи кӯмакро (сомонӣ) дохил кунед:</p>
                            <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Маблағ (сомонӣ)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amountForAccountant}
                                    onChange={(e) => setAmountForAccountant(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setAmountModalOpen(false); setAmountForAccountant(''); }}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all"
                            >
                                Бекор кардан
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAmountToAccountant}
                                disabled={amountSubmitting || !amountForAccountant.trim()}
                                className="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                {amountSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                Сабт кардан
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Dialogs */}
            <EditFormDialog
                isOpen={isEditFormOpen}
                onClose={() => setIsEditFormOpen(false)}
                form={form}
                onSuccess={fetchData}
            />
            <EditPollDialog
                isOpen={isEditPollOpen}
                onClose={() => setIsEditPollOpen(false)}
                poll={poll}
                formId={id}
                onSuccess={fetchData}
            />
        </div>
    );
}
