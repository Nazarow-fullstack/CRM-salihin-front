'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    User,
    MapPin,
    Calendar,
    Users,
    DollarSign,
    Briefcase,
    Phone,
    X,
    Loader2,
    FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/axios';

// Helper Functions
function calculateAge(dateString) {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
};

const STATUS_LABELS = {
    new_message: 'Паёми нав',
    submitted: 'Пуркардани анкета',
    under_review: 'Кумита',
    to_accountant: 'Бухгалтерия',
    rejected: 'Рад карда шуд',
    approved: 'Бомуваффақият қабул карда шуд',
    family_video: 'Видеои кандидат оила',
    help_later: 'Баъдтар кӯмак мекунем',
    bank_card: 'Ҳуҷҷат',
    deleted: 'Удалит',
};

const STATUS_COLORS = {
    new_message: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    submitted: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    under_review: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    to_accountant: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    rejected: 'bg-red-500/10 border-red-500/20 text-red-400',
    approved: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    family_video: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
    help_later: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
    bank_card: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    deleted: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
};

export default function FamilyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;

    const [family, setFamily] = useState(null);
    const [allForms, setAllForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPoll, setSelectedPoll] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch single form
                const formRes = await api.get(`/forms/${id}/`);
                setFamily(formRes.data);
                console.log(formRes.data);

                // Fetch all forms to find same-name applications
                const allRes = await api.get('/forms/');
                setAllForms(allRes.data);
            } catch (err) {
                console.error('Failed to fetch family data:', err);
                setError('Маълумот гирифта нашуд');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    // Find all forms with same name
    const sameNameForms = useMemo(() => {
        if (!family || !allForms.length) return [];
        return allForms.filter(f =>
            f.full_name && f.full_name.trim().toLowerCase() === family.full_name.trim().toLowerCase()
        );
    }, [family, allForms]);

    // Combine all polls from same-name forms
    const allPolls = useMemo(() => {
        return sameNameForms.flatMap(f => f.polls || []);
    }, [sameNameForms]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error || !family) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-red-400">{error || 'Оила ёфт нашуд'}</p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                >
                    Бозгашт
                </button>
            </div>
        );
    }

    const firstPoll = allPolls[0];
    const age = firstPoll?.data_of_birth ? calculateAge(firstPoll.data_of_birth) : null;

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
                                <p className="text-sm text-slate-400 mt-1">ID: <span className="text-blue-400 font-mono">#{family.id}</span></p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Card - Left */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-1"
                    >
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="p-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full shadow-lg">
                                        <User className="w-16 h-16 text-white" />
                                    </div>
                                    <div className="w-full">
                                        <h2 className="text-2xl font-bold text-white">{family.full_name}</h2>
                                        {age && (
                                            <p className="text-lg text-slate-400 mt-2">{age} сола</p>
                                        )}
                                    </div>
                                    <div className="w-full space-y-3 pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                                <MapPin className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="text-xs text-slate-500">Минтақа</p>
                                                <p className="text-white font-medium">{family.address_region || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                <Phone className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="text-xs text-slate-500">Телефон</p>
                                                <p className="text-white font-medium">{family.phone_number || '—'}</p>
                                            </div>
                                        </div>
                                        {family.detailed_address && (
                                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                                <div className="p-2 bg-blue-500/10 rounded-lg mt-0.5">
                                                    <MapPin className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <div className="text-left flex-1">
                                                    <p className="text-xs text-slate-500">Суроғаи муфассал</p>
                                                    <p className="text-white text-sm leading-relaxed">{family.detailed_address}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Help Requests Table - Right */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-white/10 bg-slate-950/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-xl">
                                        <FileText className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-white">Рӯйхати дархостҳо</h2>
                                    <span className="ml-auto px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium rounded-lg">
                                        {allPolls.length} дархост
                                    </span>
                                </div>
                            </div>

                            {allPolls.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-950/30 border-b border-white/10">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                    Сабаби кӯмак
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                    Санаи дархост
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {allPolls.map((poll, idx) => (
                                                <motion.tr
                                                    key={poll.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => setSelectedPoll(poll)}
                                                    className="hover:bg-white/5 cursor-pointer transition-all group"
                                                >
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                                            {poll.yarim_reason || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-slate-300">
                                                            <Calendar className="w-4 h-4 text-slate-500" />
                                                            {formatDate(poll.uploaded_at)}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-12 text-center text-slate-500">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                    <p>Дархостҳо мавҷуд нестанд</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Poll Detail Modal */}
            <AnimatePresence>
                {selectedPoll && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedPoll(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-white/10"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex items-center justify-between z-10">
                                <h2 className="text-2xl font-bold text-white">Маълумот дар бораи ариза</h2>
                                <button
                                    onClick={() => setSelectedPoll(null)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
                                {/* Form Information Section */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                                        <h3 className="text-lg font-semibold text-white">Маълумоти асосии ариза</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoRow label="Ном ва насаб" value={family.full_name} />
                                        <InfoRow label="Телефон" value={family.phone_number} />
                                        <InfoRow label="Минтақа" value={family.address_region} />
                                        <InfoRow label="Мақсади ариза" value={family.application_purpose} />
                                        <div className="md:col-span-2">
                                            <InfoRow label="Суроғаи муфассал" value={family.detailed_address} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InfoRow label="Тавсиф" value={family.description} />
                                        </div>
                                        <InfoRow label="Санаи дархост" value={formatDate(family.created_at)} />
                                        <div>
                                            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium block mb-2">Ҳолати ариза</span>
                                            <span className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-lg border ${STATUS_COLORS[family.status] || 'bg-gray-500/10 border-gray-500/20 text-gray-400'}`}>
                                                {STATUS_LABELS[family.status] || family.status || '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Poll Information Section */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                                        <h3 className="text-lg font-semibold text-white">Анкета</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoRow label="Сабаби кӯмак" value={selectedPoll.yarim_reason} highlighted />
                                        <InfoRow label="Санаи дархост" value={formatDate(selectedPoll.uploaded_at)} />
                                        <InfoRow label="Шумораи аъзоёни оила" value={selectedPoll.family_members} icon={<Users className="w-4 h-4" />} />
                                        <InfoRow label="Маъоши моҳона" value={selectedPoll.monthly_income} icon={<DollarSign className="w-4 h-4" />} />
                                        <InfoRow label="Касб" value={selectedPoll.profession_jobs} icon={<Briefcase className="w-4 h-4" />} />
                                        <InfoRow label="Санаи таваллуд" value={selectedPoll.data_of_birth} icon={<Calendar className="w-4 h-4" />} />
                                        <div className="md:col-span-2">
                                            <InfoRow label="Вазъи молиявӣ" value={selectedPoll.financial_status} />
                                        </div>
                                    </div>

                                    {/* Family Workers */}
                                    {selectedPoll.family_workers && selectedPoll.family_workers.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="text-md font-semibold text-white mb-3">Аъзоёни шоғил</h4>
                                            <div className="space-y-2">
                                                {selectedPoll.family_workers.map((worker, idx) => (
                                                    <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/5">
                                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Ном:</span>
                                                                <p className="text-white font-medium">{worker.name || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Касб:</span>
                                                                <p className="text-white font-medium">{worker.job || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 text-xs">Маош:</span>
                                                                <p className="text-white font-medium">{worker.monthly_income || '—'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Family Phone Numbers */}
                                    {selectedPoll.family_phone_numbers && selectedPoll.family_phone_numbers.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="text-md font-semibold text-white mb-3">Рақамҳои тамос</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {selectedPoll.family_phone_numbers.map((phone, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                                                        <Phone className="w-4 h-4 text-emerald-400" />
                                                        <div className="flex-1">
                                                            <p className="text-xs text-slate-500">{phone.name_of_person || '—'}</p>
                                                            <p className="text-white font-medium">{phone.phone_number || '—'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper Component for Info Rows
function InfoRow({ label, value, icon, highlighted }) {
    return (
        <div className={`p-3 rounded-xl border ${highlighted ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium block mb-1.5">
                {label}
            </span>
            <div className="flex items-center gap-2">
                {icon && <div className="text-slate-400">{icon}</div>}
                <p className={`font-semibold ${highlighted ? 'text-blue-400' : 'text-white'}`}>
                    {value || '—'}
                </p>
            </div>
        </div>
    );
}
