'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    User, Phone, MapPin, Calendar, FileText,
    ArrowLeft, Edit, CreditCard, Check, X,
    Plus, Trash2, Clock, AlertCircle, Loader2,
    Send, Briefcase, Users, DollarSign, Activity,
    ChevronLeft, ChevronRight, RotateCw, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import useAuthStore from '@/store/useAuthStore';
import api from '@/lib/axios';
import { EditFormDialog, EditPollDialog } from '@/components/EditDialogs';
import { formatFormDisplayName } from '@/lib/formDisplayName';
import { FORMS_PAGE_SIZE } from '@/lib/formsListApi';
import { clearCache } from '@/utils/apiCache';

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
    deleted: 'Нест карда шуд',
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

const ACTIVITY_DOT_COLORS = {
    created: 'bg-blue-500',
    new_message: 'bg-orange-400',
    submitted: 'bg-blue-400',
    under_review: 'bg-purple-400',
    to_accountant: 'bg-teal-400',
    rejected: 'bg-red-400',
    approved: 'bg-emerald-400',
    family_video: 'bg-pink-400',
    help_later: 'bg-slate-400',
    bank_card: 'bg-yellow-400',
    deleted: 'bg-gray-400',
};

const ACTIVITY_DOT_HEX = {
    new_message: '#fb923c',
    submitted: '#60a5fa',
    under_review: '#c084fc',
    to_accountant: '#2dd4bf',
    rejected: '#f87171',
    approved: '#4ade80',
    family_video: '#f472b6',
    help_later: '#94a3b8',
    bank_card: '#facc15',
    deleted: '#9ca3af',
};

const extractHistoryItems = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.histories)) return data.histories;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.history)) return data.history;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.status_history)) return data.status_history;
    if (Array.isArray(data?.status_changes)) return data.status_changes;
    if (Array.isArray(data?.logs)) return data.logs;
    if (Array.isArray(data?.activities)) return data.activities;

    if (data && typeof data === 'object') {
        const candidate = Object.values(data).find((value) =>
            Array.isArray(value) &&
            value.some((item) =>
                item &&
                typeof item === 'object' &&
                (
                    item.new_status ||
                    item.status ||
                    item.to_status ||
                    item.changed_at ||
                    item.created_at ||
                    item.timestamp
                )
            )
        );

        if (Array.isArray(candidate)) return candidate;
    }

    return [];
};

const getHistoryStatusValue = (item) => {
    if (!item || typeof item !== 'object') return null;

    return (
        item.new_status ||
        item.status ||
        item.to_status ||
        item.new_value ||
        item.newState ||
        item.next_status ||
        item.status_code ||
        item.label ||
        null
    );
};

const getPreviousHistoryStatusValue = (item) => {
    if (!item || typeof item !== 'object') return null;

    return (
        item.old_status ||
        item.previous_status ||
        item.from_status ||
        item.old_value ||
        item.previous_value ||
        item.prev_status ||
        null
    );
};

const getHistoryActorName = (item) => {
    if (!item || typeof item !== 'object') return null;

    const directName =
        item.changed_by_username ||
        item.user_username ||
        item.username ||
        item.user_name ||
        item.changed_by_name ||
        item.full_name ||
        item.actor_name;

    if (directName) return directName;

    const nestedUser =
        item.user?.username ||
        item.user?.full_name ||
        item.user?.name ||
        item.changed_by?.username ||
        item.changed_by?.full_name ||
        item.changed_by?.name;

    if (nestedUser) return nestedUser;

    const numericId = item.user || item.changed_by || item.user_id || item.changed_by_id;
    if (numericId) return `Корбар #${numericId}`;

    return null;
};

const getHistoryDateValue = (item) => {
    if (!item || typeof item !== 'object') return null;

    return (
        item.changed_at ||
        item.created_at ||
        item.date ||
        item.timestamp ||
        item.updated_at ||
        null
    );
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
    const idRef = useRef(id);
    idRef.current = id;

    // State
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [relatedForms, setRelatedForms] = useState([]);
    const [relatedVisibleCount, setRelatedVisibleCount] = useState(FORMS_PAGE_SIZE);
    const [poll, setPoll] = useState(null);

    // Notes
    const [newNote, setNewNote] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    // Edit Dialogs
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [isEditPollOpen, setIsEditPollOpen] = useState(false);

    // Amount for to_accountant modal (combined with reason modal)
    const [amountForAccountant, setAmountForAccountant] = useState('');

    // Reason modal (rejected / to_accountant)
    const [reasonModalOpen, setReasonModalOpen] = useState(false);
    const [reasonModalTarget, setReasonModalTarget] = useState(null); // 'rejected' | 'to_accountant'
    const [reasonText, setReasonText] = useState('');
    const [reasonSubmitting, setReasonSubmitting] = useState(false);
    const [selectedDocIndex, setSelectedDocIndex] = useState(null);
    const [previewRotationByDocId, setPreviewRotationByDocId] = useState({});
    const [deletingDocumentId, setDeletingDocumentId] = useState(null);
    const openPollHandledRef = useRef(false);

    const openDocPreview = (index) => setSelectedDocIndex(index);
    const closeDocPreview = () => setSelectedDocIndex(null);
    const showPrevDoc = () => {
        if (!orderedDocuments.length) return;
        setSelectedDocIndex((prev) => {
            if (prev === null) return 0;
            return prev === 0 ? orderedDocuments.length - 1 : prev - 1;
        });
    };
    const showNextDoc = () => {
        if (!orderedDocuments.length) return;
        setSelectedDocIndex((prev) => {
            if (prev === null) return 0;
            return prev === orderedDocuments.length - 1 ? 0 : prev + 1;
        });
    };

    // Fetch: аввал форма (зуд намоиш), баъд таърих ва алоқаманд — дар замина
    const fetchData = useCallback(async () => {
        const formId = id;
        const isStale = () => idRef.current !== formId;

        try {
            setError(null);
            setLoading(true);
            setHistoryLoading(true);

            const formRes = await api.get(`/forms/${formId}/`);
            if (isStale()) return;

            const fallbackHistory = extractHistoryItems(formRes.data);
            setForm(formRes.data);
            setHistory(fallbackHistory);
            setRelatedForms([]);
            if (formRes.data.polls && formRes.data.polls.length > 0) {
                setPoll(formRes.data.polls[0]);
            } else {
                setPoll(null);
            }
            setLoading(false);

            const [historyRes, relatedRes] = await Promise.all([
                api.get(`/history/form/${formId}/`).catch(() => ({ data: [] })),
                api.get(`/forms/${formId}/related_forms/`).catch(() => ({ data: [] })),
            ]);
            if (isStale()) return;

            const extractedHistory = extractHistoryItems(historyRes.data);
            setHistory(
                fallbackHistory.length > extractedHistory.length
                    ? fallbackHistory
                    : extractedHistory
            );
            const relRaw = relatedRes.data;
            setRelatedForms(Array.isArray(relRaw) ? relRaw : relRaw?.results ?? []);
            setRelatedVisibleCount(FORMS_PAGE_SIZE);
        } catch (err) {
            if (!isStale()) {
                setError('Маълумоти ариза бор нашуд.');
            }
        } finally {
            if (!isStale()) {
                setLoading(false);
                setHistoryLoading(false);
            }
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchData();
    }, [id, fetchData]);

    useEffect(() => {
        openPollHandledRef.current = false;
    }, [id]);

    useEffect(() => {
        if (loading || !form) return;
        if (typeof window === 'undefined') return;
        if (openPollHandledRef.current) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('openPoll') !== '1') return;
        openPollHandledRef.current = true;
        setIsEditPollOpen(true);
        router.replace(`/dashboard/applications/${id}`, { scroll: false });
    }, [loading, form, id, router]);

    // Handle Status Change
    const handleStatusChange = async (newStatus) => {
        try {
            await api.patch(`/forms/${id}/`, { status: newStatus });

            // Агар статус "approved" шавад → пардохтро автоматӣ "Пардохт шуд" мекунем
            if (newStatus === 'approved') {
                const today = new Date().toISOString().split('T')[0];
                const existingPaymentId = form?.payment?.id;
                if (existingPaymentId) {
                    // Пардохти мавҷуда → навсозӣ
                    await api.patch(`/payments/${existingPaymentId}/`, {
                        payment_status: 'paid',
                        payment_date: form.payment.payment_date || today,
                    });
                } else {
                    // Пардохти нав эҷод мекунем
                    await api.post('/payments/', {
                        form: id,
                        payment_status: 'paid',
                        payment_date: today,
                    });
                }
            }

            // Families sahifasining cacheni tozalaymiz — eski ma'lumot ko'rinmasin
            clearCache('/forms/');
            fetchData();
        } catch (err) {
            alert('Вазъият тағйир нашуд. Лутфан дубора кӯшиш кунед.');
        }
    };

    // When user selects to_accountant from dropdown: if currently under_review, show amount modal first
    // Also intercept rejected / to_accountant to require a reason note
    const handleStatusSelect = (newStatus) => {
        // "rejected" or "to_accountant" → ask for reason first
        if (newStatus === 'rejected' || newStatus === 'to_accountant') {
            setReasonModalTarget(newStatus);
            setReasonText('');
            setReasonModalOpen(true);
            return;
        }
        handleStatusChange(newStatus);
    };

    // Submit reason (+ optional amount) then proceed with status change
    const handleReasonSubmit = async () => {
        if (!reasonText.trim()) {
            alert('Лутфан сабабро нависед');
            return;
        }
        const needsAmount = reasonModalTarget === 'to_accountant' && form?.status === 'under_review';
        if (needsAmount) {
            const amount = parseFloat(amountForAccountant);
            if (isNaN(amount) || amount <= 0) {
                alert('Маблағи кӯмакро дохил кунед');
                return;
            }
        }
        setReasonSubmitting(true);
        try {
            const noteType = reasonModalTarget === 'rejected' ? 'rejection_reason' : 'accountant_reason';
            await api.post('/form-notes/', { form: id, note: reasonText.trim(), note_type: noteType });

            if (needsAmount) {
                const amount = parseFloat(amountForAccountant);
                await api.patch(`/forms/${id}/`, {
                    status: 'to_accountant',
                    approved_amount: amount,
                    aidmounts: [{ amount }]
                });
                fetchData();
            } else {
                await handleStatusChange(reasonModalTarget);
            }
            setReasonModalOpen(false);
            setReasonText('');
            setAmountForAccountant('');
        } catch {
            alert('Хатогӣ: маълумот сабт нашуд');
        } finally {
            setReasonSubmitting(false);
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
                user_username: user?.username || 'Шумо',
                created_at: new Date().toISOString()
            };

            setForm(prev => ({
                ...prev,
                notes: [...(prev.notes || []), optimisticNote]
            }));
            setNewNote('');

            await api.post('/form-notes/', { form: id, note: newNote });
        } catch (err) {
            alert('Шарҳ илова нашуд. Лутфан дубора кӯшиш кунед.');
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const allowedStatuses = useMemo(() => {
        if (!user || !form) return [];
        if (user.role === 'superuser') return STATUS_TRANSITIONS['superuser']?.[form.status] || [];
        // Use per-user allowed_transitions if set
        const transitions = user.allowed_transitions || {};
        if (Object.keys(transitions).length > 0) {
            return transitions[form.status] || [];
        }
        // Fallback to role defaults
        return STATUS_TRANSITIONS[user.role]?.[form.status] || [];
    }, [user, form]);

    const formHistory = useMemo(() => {
        return history
            .map((item, index) => {
                const newStatus = getHistoryStatusValue(item);
                const oldStatus = getPreviousHistoryStatusValue(item);
                const changedAt = getHistoryDateValue(item);
                const changedBy = getHistoryActorName(item);

                return {
                    id: item.id || `history-${index}`,
                    old_status: oldStatus,
                    new_status: newStatus,
                    changed_at: changedAt,
                    user: changedBy,
                };
            })
            .filter((item) => item.new_status)
            .sort((a, b) => new Date(a.changed_at || 0) - new Date(b.changed_at || 0));
    }, [history]);

    const orderedDocuments = useMemo(() => {
        const docs = Array.isArray(form?.documents) ? [...form.documents] : [];
        return docs.sort((a, b) => {
            const dateA = new Date(a.uploaded_at || a.created_at || 0).getTime();
            const dateB = new Date(b.uploaded_at || b.created_at || 0).getTime();

            if (dateA && dateB && dateA !== dateB) {
                return dateA - dateB;
            }

            return (a.id || 0) - (b.id || 0);
        });
    }, [form]);

    const rotatePreviewBy = useCallback((deltaDeg) => {
        if (selectedDocIndex === null) return;
        const doc = orderedDocuments[selectedDocIndex];
        if (!doc) return;
        const key = doc.id != null ? doc.id : `idx-${selectedDocIndex}`;
        setPreviewRotationByDocId((prev) => {
            const cur = prev[key] || 0;
            const next = (((cur + deltaDeg) % 360) + 360) % 360;
            return { ...prev, [key]: next };
        });
    }, [selectedDocIndex, orderedDocuments]);

    const handleDeleteDocument = useCallback(
        async (docId) => {
            if (docId == null) return;
            if (!window.confirm('Ҳуҷҷат нест шавад? Ин амал барқартар нест.')) return;
            const delIdx = orderedDocuments.findIndex((d) => d.id === docId);
            try {
                setDeletingDocumentId(docId);
                await api.delete(`/documents/${docId}/`);
                setPreviewRotationByDocId((prev) => {
                    if (!prev[docId]) return prev;
                    const next = { ...prev };
                    delete next[docId];
                    return next;
                });
                setSelectedDocIndex((prev) => {
                    if (prev === null) return null;
                    if (delIdx === -1) return prev;
                    if (prev === delIdx) {
                        const remaining = orderedDocuments.length - 1;
                        if (remaining <= 0) return null;
                        return Math.min(prev, remaining - 1);
                    }
                    if (prev > delIdx) return prev - 1;
                    return prev;
                });
                await fetchData();
            } catch (err) {
                alert('Нест кардани ҳуҷҷат муяссар нашуд');
            } finally {
                setDeletingDocumentId(null);
            }
        },
        [orderedDocuments, fetchData]
    );

    const formatActivityDate = (value) => {
        if (!value) return '—';
        return new Date(value).toLocaleString('tg-TJ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!form) return <div className="p-8 text-center text-slate-400">Ариза ёфт нашуд</div>;

    return (
        <div className="application-detail-theme min-h-screen">
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

                {/* Rejection / Accountant reason banner */}
                {(() => {
                    const rejectionNote = [...(form?.notes || [])].reverse().find(n => n.note_type === 'rejection_reason');
                    const accountantNote = [...(form?.notes || [])].reverse().find(n => n.note_type === 'accountant_reason');
                    const reasonNote = form?.status === 'rejected' ? rejectionNote : (form?.status === 'to_accountant' ? accountantNote : null);
                    if (!reasonNote) return null;
                    const isRejected = reasonNote.note_type === 'rejection_reason';
                    return (
                        <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border mb-2 ${isRejected ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                            <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isRejected ? 'text-red-400' : 'text-amber-400'}`} />
                            <div className="flex-1">
                                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isRejected ? 'text-red-400' : 'text-amber-400'}`}>
                                    {isRejected ? 'Сабаби рад кардан' : 'Сабаби ба бухгалтерия фиристодан'}
                                </p>
                                <p className="text-sm text-white">{reasonNote.note}</p>
                                {!isRejected && form?.approved_amount && (
                                    <p className="text-sm font-semibold text-teal-300 mt-1">
                                        Маблағи тасдиқшуда: {Number(form.approved_amount).toLocaleString()} сомонӣ
                                    </p>
                                )}
                                <p className="text-xs text-slate-500 mt-1">
                                    <span className={`font-semibold ${isRejected ? 'text-red-400' : 'text-amber-400'}`}>{reasonNote.user_username}</span>
                                    {' тарафӣ · '}{new Date(reasonNote.created_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    );
                })()}

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
                                    <h2 className="text-lg font-semibold text-white">{formatFormDisplayName(form) || form.full_name || '—'}</h2>
                                </div>
                                <button
                                    onClick={() => setIsEditFormOpen(true)}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20 transition-all hover:bg-blue-500/20"
                                >
                                    <Edit className="w-3 h-3" /> ислоҳ
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    
                                <div className="space-y-2">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                                        Рақами телефон
                                    </span>

                                    {/* Ana telefon */}
                                    <div className="text-white font-semibold text-lg flex items-center gap-2">
                                        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                        </div>
                                        {form.phone_number}
                                    </div>
                                    {poll?.family_phone_numbers?.map((phone) => (
                                        <div key={phone.id} className="text-slate-300 text-sm pl-8">
                                            {phone.phone_number}
                                        </div>
                                    ))}
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
                                        <p className="text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5 whitespace-pre-wrap">{form.detailed_address || '—'}</p>
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
                                        <Edit className="w-3 h-3" /> Ислоҳ
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
                                        <p className="text-white font-semibold mt-2 whitespace-pre-wrap">{poll.profession_jobs}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 md:col-span-2">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Мақсади кӯмак</span>
                                        <p className="text-white font-semibold mt-2">{poll.yarim_reason}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 md:col-span-2">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Ҷойи зист</span>
                                        <p className="text-white font-semibold mt-2">{poll.place_of_residence || '—'}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 md:col-span-2">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Вазъи молиявӣ</span>
                                        <p className="text-white font-semibold mt-2 whitespace-pre-wrap">{poll.financial_status}</p>
                                    </div>
                                    {poll.hulosa_korresp && (
                                        <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 md:col-span-2">
                                            <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Хулосаи корреспондент</span>
                                            <p className="text-white font-semibold mt-2 whitespace-pre-wrap">{poll.hulosa_korresp}</p>
                                        </div>
                                    )}
                                </div>

                                {poll.family_workers?.length > 0 && (
                                    <div className="overflow-hidden rounded-xl border border-white/10">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold">Ном</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Шахс</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Вазъияти шахс</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Санаи таваллуд</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Касб</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Маъоши моҳона</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {poll.family_workers.map((worker, i) => (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-3 text-white font-medium">{worker.name}</td>
                                                        <td className="px-4 py-3 text-slate-300">{worker.person}</td>
                                                        <td className="px-4 py-3 text-slate-300">{worker.person_situation || '—'}</td>
                                                        <td className="px-4 py-3 text-slate-300">{worker.data_of_birth}</td>
                                                        <td className="px-4 py-3 text-slate-300 whitespace-pre-wrap">{worker.job}</td>
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
                        {orderedDocuments.length > 0 && (
                            <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-500/10 rounded-xl">
                                        <FileText className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-white">Ҳуҷҷатҳо (Паспорт ва дигар)</h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {orderedDocuments.map((doc, idx) => {
                                        const thumbRotKey = doc.id != null ? doc.id : `idx-${idx}`;
                                        const thumbRotDeg = previewRotationByDocId[thumbRotKey] || 0;
                                        return (
                                        <div
                                            key={doc.id ?? idx}
                                            className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer shadow-md hover:shadow-xl"
                                            onClick={() => openDocPreview(idx)}
                                        >
                                            {doc.id != null && ['superuser', 'accountant'].includes(user?.role) && (
                                                <button
                                                    type="button"
                                                    title="Нест кардан"
                                                    disabled={deletingDocumentId === doc.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteDocument(doc.id);
                                                    }}
                                                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-red-600/90 text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                                >
                                                    {deletingDocumentId === doc.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                            {doc.file_url?.toLowerCase().endsWith('.pdf') ? (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 gap-2">
                                                    <FileText className="w-10 h-10 text-red-400" />
                                                    <span className="text-xs text-slate-400 font-medium">PDF</span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={doc.file_url}
                                                    alt={`Document ${idx + 1}`}
                                                    style={{ transform: `rotate(${thumbRotDeg}deg)` }}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
                                                <span className="text-white font-semibold text-xs px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                                                    Намоиши пурра
                                                </span>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Content (Right Col) - Enhanced */}
                    <div className="space-y-6">

                        {/* Notes Section - Enhanced */}
                        <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col h-[480px] shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Шарҳ мондан</h2>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}>
                                {form.notes?.filter(n => n.note_type === 'note' || !n.note_type).map((note, i) => (
                                    <div key={note.id || i} className="flex gap-3 text-sm">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="flex-1 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl border border-white/10 p-4 shadow-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-blue-300">{note.user_username}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">
                                                    {new Date(note.created_at).toLocaleString('tg-TJ', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-slate-200 leading-relaxed">{note.note}</p>
                                        </div>
                                    </div>
                                ))}

                                {(!form.notes || form.notes.filter(n => n.note_type === 'note' || !n.note_type).length === 0) && (
                                    <p className="text-sm text-slate-500">Ҳоло ягон шарҳ нест.</p>
                                )}
                            </div>

                            {/* Input Area - Enhanced */}
                            <form onSubmit={handleAddNote} className="relative">
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Шарҳ нависед..."
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
                                    <input type="file" multiple accept="image/*,application/pdf" className="hidden"
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
                                                alert('Ҳуҷҷат бор нашуд. Лутфан дубора кӯшиш кунед.');
                                            }
                                        }}
                                    />
                                    <div className="flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border border-blue-500/30 rounded-xl cursor-pointer transition-all group shadow-lg hover:shadow-xl hover:scale-105">
                                        <FileText className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-sm text-blue-400 font-semibold">Паспорт</span>
                                    </div>
                                </label>

                                <label className="block">
                                    <input type="file" multiple accept="image/*,application/pdf" className="hidden"
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
                                                alert('Ҳуҷҷат бор нашуд. Лутфан дубора кӯшиш кунед.');
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
                                    {relatedForms.slice(0, relatedVisibleCount).map(rForm => (
                                        <Link
                                            key={rForm.id}
                                            href={`/dashboard/applications/${rForm.id}`}
                                            className="block p-4 rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 border border-white/10 hover:border-blue-500/30 transition-all group shadow-lg hover:shadow-xl hover:scale-105"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                        {formatFormDisplayName(rForm) || rForm.full_name || '—'}
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
                                {relatedVisibleCount < relatedForms.length && (
                                    <button
                                        type="button"
                                        onClick={() => setRelatedVisibleCount((c) => Math.min(c + FORMS_PAGE_SIZE, relatedForms.length))}
                                        className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium border border-blue-500/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 transition-colors"
                                    >
                                        Ҳоли дигар {FORMS_PAGE_SIZE} та ({relatedForms.length - relatedVisibleCount} мондааст)
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Activity History */}
                        <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-lg font-semibold text-white mb-6">
                                Таърихи фаъолият
                            </h2>

                            {historyLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                </div>
                            ) : (
                                <div className="max-h-[420px] overflow-y-auto pr-2 space-y-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}>
                                    {form && (
                                        <div className="flex items-start gap-4">
                                            <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base font-semibold text-white">Ариза пешниҳод карда шуд</p>
                                                <p className="text-slate-400 mt-1 text-sm">Ариза: {formatFormDisplayName(form) || form.full_name || '—'}</p>
                                                {form.created_by_username && (
                                                    <p className="text-slate-400 mt-1 text-sm">Эҷод карда шуд: {form.created_by_username}</p>
                                                )}
                                                <p className="text-slate-400 mt-1 text-sm">{formatActivityDate(form.created_at)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {formHistory.map((historyItem) => (
                                        <div key={historyItem.id} className="flex items-start gap-4">
                                            <div
                                                className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                                                style={{ backgroundColor: ACTIVITY_DOT_HEX[historyItem.new_status] || '#9CA3AF' }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base font-semibold text-white">
                                                    {STATUS_LABELS[historyItem.new_status] || historyItem.new_status || 'Тағйири вазъият'}
                                                </p>
                                                {historyItem.old_status && (
                                                    <p className="text-slate-400 mt-1 text-sm">
                                                        Аз: {STATUS_LABELS[historyItem.old_status] || historyItem.old_status}
                                                    </p>
                                                )}
                                                <p className="text-slate-400 mt-1 text-sm">
                                                    Ба: {STATUS_LABELS[historyItem.new_status] || historyItem.new_status || '—'}
                                                </p>
                                                <p className="text-slate-400 mt-1 text-sm">
                                                    аз ҷониби {historyItem.user || '—'}
                                                </p>
                                                <p className="text-slate-400 mt-1 text-sm">
                                                    {formatActivityDate(historyItem.changed_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {formHistory.length === 0 && (
                                        <div className="p-3 rounded-xl bg-white/5 text-center">
                                            <p className="text-sm text-slate-500">Ҳанӯз ҳеҷ тағйири вазъият нест</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Document Preview Modal */}
            {selectedDocIndex !== null && orderedDocuments[selectedDocIndex] && (() => {
                const previewDoc = orderedDocuments[selectedDocIndex];
                const previewRotKey = previewDoc.id != null ? previewDoc.id : `idx-${selectedDocIndex}`;
                const previewRotDeg = previewRotationByDocId[previewRotKey] || 0;
                return (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <button
                        type="button"
                        onClick={closeDocPreview}
                        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {orderedDocuments.length > 1 && (
                        <button
                            type="button"
                            onClick={showPrevDoc}
                            className="absolute left-4 md:left-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}

                    <div className="w-full max-w-5xl">
                        <div className="flex justify-center max-h-[78vh] overflow-hidden rounded-xl">
                            {previewDoc.file_url?.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={previewDoc.file_url}
                                    title={`PDF ${selectedDocIndex + 1}`}
                                    className="w-full h-[78vh] rounded-xl border-0 bg-white"
                                />
                            ) : (
                                <img
                                    src={previewDoc.file_url}
                                    alt={`Document ${selectedDocIndex + 1}`}
                                    style={{ transform: `rotate(${previewRotDeg}deg)` }}
                                    className="max-w-full max-h-[78vh] w-auto h-auto object-contain transition-transform duration-200"
                                />
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-white">
                            <span className="text-sm text-slate-300">
                                {selectedDocIndex + 1} / {orderedDocuments.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => rotatePreviewBy(-90)}
                                className="text-sm p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 inline-flex items-center gap-1.5"
                                aria-label="Баргардонидани акс ба чап"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span className="hidden sm:inline">90°</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => rotatePreviewBy(90)}
                                className="text-sm p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 inline-flex items-center gap-1.5"
                                aria-label="Баргардонидани акс ба рост"
                            >
                                <RotateCw className="w-4 h-4" />
                                <span className="hidden sm:inline">90°</span>
                            </button>
                            <a
                                href={previewDoc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
                            >
                                Open Original
                            </a>
                            {previewDoc.id != null && ['superuser', 'accountant'].includes(user?.role) && (
                                <button
                                    type="button"
                                    disabled={deletingDocumentId === previewDoc.id}
                                    onClick={() => handleDeleteDocument(previewDoc.id)}
                                    className="text-sm px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-200 inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {deletingDocumentId === previewDoc.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    Нест
                                </button>
                            )}
                        </div>
                    </div>

                    {orderedDocuments.length > 1 && (
                        <button
                            type="button"
                            onClick={showNextDoc}
                            className="absolute right-4 md:right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}
                </div>
                );
            })()}

            {/* Modal: Reason (+ optional amount for under_review → to_accountant) */}
            {reasonModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-white/10 overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">
                                {reasonModalTarget === 'rejected' ? '❌ Сабаби рад кардан' : '📋 Сабаби ба бухгалтерия фиристодан'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => { setReasonModalOpen(false); setReasonText(''); setAmountForAccountant(''); }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Сабаб</label>
                                <textarea
                                    value={reasonText}
                                    onChange={(e) => setReasonText(e.target.value)}
                                    rows={3}
                                    placeholder="Сабабро дар ин ҷо нависед..."
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                />
                            </div>
                            {reasonModalTarget === 'to_accountant' && form?.status === 'under_review' && (
                                <div>
                                    <label className="block text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Маблағи тасдиқшуда (сомонӣ)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={amountForAccountant}
                                        onChange={(e) => setAmountForAccountant(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                type="button"
                                onClick={() => { setReasonModalOpen(false); setReasonText(''); setAmountForAccountant(''); }}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all"
                            >
                                Бекор кардан
                            </button>
                            <button
                                type="button"
                                onClick={handleReasonSubmit}
                                disabled={reasonSubmitting || !reasonText.trim()}
                                className={`flex-1 px-4 py-2.5 disabled:opacity-50 rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2 ${
                                    reasonModalTarget === 'rejected' ? 'bg-red-600 hover:bg-red-500' : 'bg-teal-500 hover:bg-teal-600'
                                }`}
                            >
                                {reasonSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                Тасдиқ кардан
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
