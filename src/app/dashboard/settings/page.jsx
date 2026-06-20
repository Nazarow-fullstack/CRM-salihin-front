'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';

const ALL_STATUSES = [
    { value: 'new_message',   label: 'Паёми нав' },
    { value: 'submitted',     label: 'Пуркардани анкета' },
    { value: 'under_review',  label: 'Кумита' },
    { value: 'to_accountant', label: 'Бухгалтерия' },
    { value: 'rejected',      label: 'Рад карда шуд' },
    { value: 'approved',      label: 'Қабул карда шуд' },
    { value: 'family_video',  label: 'Видеои оила' },
    { value: 'help_later',    label: 'Баъдтар кумак' },
    { value: 'bank_card',     label: 'Рақами карт' },
    { value: 'deleted',       label: 'Удалит' },
];

export default function SettingsPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [transitions, setTransitions] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (user?.role !== 'superuser') {
            router.replace('/dashboard');
            return;
        }
        api.get('/status-workflow/').then(res => {
            setTransitions(res.data.transitions || {});
        }).finally(() => setLoading(false));
    }, [user]);

    const toggle = (fromStatus, toStatus) => {
        setTransitions(prev => {
            const current = prev[fromStatus] || [];
            const updated = current.includes(toStatus)
                ? current.filter(s => s !== toStatus)
                : [...current, toStatus];
            return { ...prev, [fromStatus]: updated };
        });
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/status-workflow/', { transitions });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Танзимоти гузариши статус</h1>
                    <p className="text-slate-400 mt-1 text-sm">Аз ҳар статус ба кадом статусҳо гузаштан мумкин аст</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Save className="w-4 h-4" />}
                    {saved ? 'Сабт шуд' : 'Сабт кардан'}
                </button>
            </div>

            <div className="space-y-4">
                {ALL_STATUSES.map(from => (
                    <div key={from.value} className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm font-semibold border border-white/10">
                                {from.label}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-400 text-sm">гузаштан мумкин аст ба:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {ALL_STATUSES.filter(s => s.value !== from.value).map(to => {
                                const checked = (transitions[from.value] || []).includes(to.value);
                                return (
                                    <button
                                        key={to.value}
                                        onClick={() => toggle(from.value, to.value)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                            checked
                                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                                : 'bg-slate-800 border-white/10 text-slate-400 hover:border-white/25'
                                        }`}
                                    >
                                        {checked ? '✓ ' : ''}{to.label}
                                    </button>
                                );
                            })}
                        </div>
                        {(transitions[from.value] || []).length === 0 && (
                            <p className="text-xs text-slate-600 mt-2">Ягон гузариш иҷозат дода нашудааст</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
