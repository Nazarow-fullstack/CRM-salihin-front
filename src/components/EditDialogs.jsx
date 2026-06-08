'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/axios';

const PLACE_OF_RESIDENCE_OPTIONS = ['Хонаи шахсӣ', 'Иҷора'];
const PERSON_SITUATION_OPTIONS = ['Маъюб', 'Ятим', 'Нимятим', 'Нафақахур', 'Бевазан', 'Камбизоат'];

const TODAY = new Date().toISOString().split('T')[0];

export function EditPollDialog({ isOpen, onClose, poll, formId, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        family_members: poll?.family_members ?? '',
        financial_status: poll?.financial_status ?? '',
        data_of_birth: poll?.data_of_birth ?? '',
        profession_jobs: poll?.profession_jobs ?? '',
        monthly_income: poll?.monthly_income ?? '',
        yarim_reason: poll?.yarim_reason ?? '',
        place_of_residence: poll?.place_of_residence ?? '',
    });

    const [familyWorkers, setFamilyWorkers] = useState(poll?.family_workers || []);
    const [familyPhones, setFamilyPhones] = useState(poll?.family_phone_numbers || []);

    useEffect(() => {
        if (!isOpen) return;
        setFormData({
            family_members: poll?.family_members ?? '',
            financial_status: poll?.financial_status ?? '',
            data_of_birth: poll?.data_of_birth ?? '',
            profession_jobs: poll?.profession_jobs ?? '',
            monthly_income: poll?.monthly_income ?? '',
            yarim_reason: poll?.yarim_reason ?? '',
            place_of_residence: poll?.place_of_residence ?? '',
        });
        // Stable key: mevcut kayıtlar için String(id), yeni eklenecekler için Date.now()
        setFamilyWorkers(
            (poll?.family_workers || []).map(w => ({ ...w, _key: String(w.id) }))
        );
        setFamilyPhones(
            (poll?.family_phone_numbers || []).map(p => ({ ...p, _key: String(p.id) }))
        );
        setError(null);
    }, [isOpen, poll]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // PATCH için tam payload — boş alanlar da gönderilir ki backend temizleyebilsin
    const sanitizePollPayload = (data) => ({
        family_members: data.family_members === '' ? null : Number(data.family_members),
        financial_status: data.financial_status || '',
        data_of_birth: data.data_of_birth || null,
        profession_jobs: data.profession_jobs || '',
        monthly_income: data.monthly_income === '' ? null : Number(data.monthly_income),
        yarim_reason: data.yarim_reason || '',
        place_of_residence: data.place_of_residence || null,
    });

    // Танҳо барои POST (сохтани нав) — майдонҳои холӣ/null филтр мешаванд
    const compactPayload = (payload) =>
        Object.fromEntries(
            Object.entries(payload).filter(([, v]) => v !== '' && v !== null && v !== undefined)
        );

    const buildFormData = (payload) => {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                fd.append(key, String(value));
            }
        });
        return fd;
    };

    const sanitizeWorker = (worker) => ({
        person: worker.person || '',
        name: worker.name || '',
        job: worker.job || '',
        monthly_income: (worker.monthly_income === '' || worker.monthly_income === null || worker.monthly_income === undefined)
            ? null
            : Number(worker.monthly_income),
        data_of_birth: worker.data_of_birth || null,
        person_situation: worker.person_situation || null,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formId) return;

        // monthly_income validasyon
        if (formData.monthly_income !== '' && Number(formData.monthly_income) < 0) {
            setError('Маъоши моҳона манфӣ буда наметавонад');
            return;
        }

        // data_of_birth gelecek tarih kontrolü
        if (formData.data_of_birth && formData.data_of_birth > TODAY) {
            setError('Санаи таваллуд оянда буда наметавонад');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let pollId = poll?.id;
            const sanitized = sanitizePollPayload(formData);

            if (!pollId && formId) {
                const existingPollsRes = await api.get('/polls/', {
                    params: { form_id: formId }
                }).catch(() => ({ data: [] }));

                const existingPolls = Array.isArray(existingPollsRes.data)
                    ? existingPollsRes.data
                    : existingPollsRes.data?.results || [];

                if (existingPolls.length > 0) {
                    pollId = existingPolls[0].id;
                }
            }

            if (pollId) {
                // PATCH: tam payload gönder — temizlenen alanlar da backend'e iletilsin
                await api.patch(`/polls/${pollId}/`, sanitized);
            } else {
                const response = await api.post(
                    `/forms/${formId}/add_poll/`,
                    buildFormData(compactPayload(sanitized)),
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
                pollId = response.data?.id;
            }

            if (!pollId) {
                throw new Error('Анкета сабт нашуд');
            }

            // --- Aile çalışanları: akıllı diff (silme + güncelleme + ekleme) ---
            const validWorkers = familyWorkers.filter((w) =>
                w.person?.trim() || w.name?.trim() || w.job?.trim() ||
                w.monthly_income !== '' || w.data_of_birth || w.person_situation
            );

            const oldWorkerIds = new Set((poll?.family_workers || []).map(w => w.id));
            const keptWorkerIds = new Set(validWorkers.filter(w => w.id).map(w => w.id));

            // Silinen çalışanları kaldır — 404 tolere edilir (zaten silinmiş)
            const removedWorkerIds = [...oldWorkerIds].filter(id => !keptWorkerIds.has(id));
            await Promise.all(
                removedWorkerIds.map(id =>
                    api.delete(`/family-workers/${id}/`).catch(err => {
                        if (err.response?.status !== 404) throw err;
                    })
                )
            );

            // Аъзои мавҷударо навсозӣ кун — агар 404 бошад, нав эҷод кун (мушкили ID-и кӯҳна)
            await Promise.all(
                validWorkers
                    .filter(w => w.id && oldWorkerIds.has(w.id))
                    .map(w =>
                        api.patch(`/family-workers/${w.id}/`, { ...sanitizeWorker(w), poll: pollId })
                            .catch(err => {
                                if (err.response?.status === 404) {
                                    return api.post('/family-workers/', { ...sanitizeWorker(w), poll: pollId });
                                }
                                throw err;
                            })
                    )
            );

            // Yeni çalışanları ekle
            await Promise.all(
                validWorkers
                    .filter(w => !w.id)
                    .map(w => api.post('/family-workers/', { ...sanitizeWorker(w), poll: pollId }))
            );

            // --- Aile telefonları: akıllı diff ---
            const validPhones = familyPhones.filter(p =>
                p.name_of_person?.trim() && p.phone_number?.trim()
            );

            const oldPhoneIds = new Set((poll?.family_phone_numbers || []).map(p => p.id));
            const keptPhoneIds = new Set(validPhones.filter(p => p.id).map(p => p.id));

            const removedPhoneIds = [...oldPhoneIds].filter(id => !keptPhoneIds.has(id));
            await Promise.all(
                removedPhoneIds.map(id =>
                    api.delete(`/familyphonenumber/${id}/`).catch(err => {
                        if (err.response?.status !== 404) throw err;
                    })
                )
            );

            await Promise.all(
                validPhones
                    .filter(p => p.id && oldPhoneIds.has(p.id))
                    .map(p =>
                        api.patch(`/familyphonenumber/${p.id}/`, {
                            name_of_person: p.name_of_person,
                            phone_number: p.phone_number,
                            poll: pollId,
                        }).catch(err => {
                            if (err.response?.status === 404) {
                                return api.post('/familyphonenumber/', {
                                    name_of_person: p.name_of_person,
                                    phone_number: p.phone_number,
                                    poll: pollId,
                                });
                            }
                            throw err;
                        })
                    )
            );

            await Promise.all(
                validPhones
                    .filter(p => !p.id)
                    .map(p => api.post('/familyphonenumber/', {
                        name_of_person: p.name_of_person,
                        phone_number: p.phone_number,
                        poll: pollId,
                    }))
            );

            // Önce dialog kapat, sonra arka planda veriyi tazele
            // (fetchData setLoading(true) çağırdığı için await edilmez — dialog unmount olmamalı)
            onClose();
            onSuccess?.();
        } catch (err) {
            const backendError =
                err.response?.data?.detail ||
                Object.values(err.response?.data || {}).flat().join(' ') ||
                'Маълумот нигоҳ дошта нашуд';
            setError(String(backendError));
        } finally {
            setLoading(false);
        }
    };

    const updateWorker = (idx, field, value) => {
        setFamilyWorkers(prev => prev.map((w, i) => i === idx ? { ...w, [field]: value } : w));
    };

    const updatePhone = (idx, field, value) => {
        setFamilyPhones(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-white">Таҳрири анкета</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Шумораи аъзоёни оила
                            </label>
                            <input
                                type="number"
                                name="family_members"
                                min="0"
                                value={formData.family_members}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Маъоши моҳона (TJS)
                            </label>
                            <input
                                type="number"
                                name="monthly_income"
                                min="0"
                                value={formData.monthly_income}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Санаи таваллуд
                            </label>
                            <input
                                type="date"
                                name="data_of_birth"
                                max={TODAY}
                                value={formData.data_of_birth}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Ҷойи зист
                            </label>
                            <select
                                name="place_of_residence"
                                value={formData.place_of_residence}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                <option value="">Интихоб кунед</option>
                                {PLACE_OF_RESIDENCE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt} className="bg-slate-800 text-white">{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Кор / Касб
                            </label>
                            <textarea
                                name="profession_jobs"
                                value={formData.profession_jobs}
                                onChange={handleChange}
                                rows={3}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y min-h-[4rem]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Вазъи оилавӣ
                        </label>
                        <textarea
                            name="financial_status"
                            value={formData.financial_status}
                            onChange={handleChange}
                            rows={3}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Мақсади кӯмак (Сабаби кӯмак)
                        </label>
                        <select
                            name="yarim_reason"
                            value={formData.yarim_reason}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="">Интихоб кунед</option>
                            <option value="Табобат" className="bg-slate-800 text-white">Табобат</option>
                            <option value="Таҳсилот" className="bg-slate-800 text-white">Таҳсилот</option>
                            <option value="Хӯрок" className="bg-slate-800 text-white">Хӯрок</option>
                            <option value="Таъмири хона" className="bg-slate-800 text-white">Таъмири хона</option>
                            <option value="Дастгирии тиҷорат" className="bg-slate-800 text-white">Дастгирии тиҷорат</option>
                            <option value="Ниёзи аввали" className="bg-slate-800 text-white">Ниёзи аввали</option>
                        </select>
                    </div>

                    {/* Family Workers */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-slate-400">
                                Аъзои оила, ки кор мекунанд
                            </label>
                            <button
                                type="button"
                                onClick={() =>
                                    setFamilyWorkers(prev => [
                                        ...prev,
                                        { _key: `new-${Date.now()}`, person: '', name: '', job: '', monthly_income: '', data_of_birth: '', person_situation: '' },
                                    ])
                                }
                                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Илова
                            </button>
                        </div>
                        {familyWorkers.map((worker, idx) => (
                            <div key={worker._key ?? worker.id ?? idx} className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-3">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-white">Аъзои оила #{idx + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => setFamilyWorkers(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Аъзо"
                                        value={worker.person || ''}
                                        onChange={(e) => updateWorker(idx, 'person', e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Номи аъзо"
                                        value={worker.name || ''}
                                        onChange={(e) => updateWorker(idx, 'name', e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <select
                                        value={worker.person_situation || ''}
                                        onChange={(e) => updateWorker(idx, 'person_situation', e.target.value)}
                                        className="col-span-2 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    >
                                        <option value="">Интихоб кунед (вазъияти шахс)</option>
                                        {PERSON_SITUATION_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                                        ))}
                                    </select>
                                    <textarea
                                        placeholder="Кор / Касб"
                                        rows={2}
                                        value={worker.job || ''}
                                        onChange={(e) => updateWorker(idx, 'job', e.target.value)}
                                        className="col-span-2 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y min-h-[2.75rem]"
                                    />
                                    <input
                                        type="date"
                                        placeholder="Санаи таваллуд"
                                        max={TODAY}
                                        value={worker.data_of_birth || ''}
                                        onChange={(e) => updateWorker(idx, 'data_of_birth', e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Маъоши моҳона"
                                        min="0"
                                        value={worker.monthly_income || ''}
                                        onChange={(e) => updateWorker(idx, 'monthly_income', e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Family Phones */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-slate-400">
                                Рақамҳои телефони оила
                            </label>
                            <button
                                type="button"
                                onClick={() => setFamilyPhones(prev => [...prev, { _key: `new-${Date.now()}`, name_of_person: '', phone_number: '' }])}
                                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Илова
                            </button>
                        </div>
                        {familyPhones.map((phone, idx) => (
                            <div key={phone._key ?? phone.id ?? idx} className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-3">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-white">Рақами телефони #{idx + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => setFamilyPhones(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Номи аъзо"
                                        value={phone.name_of_person || ''}
                                        onChange={(e) => updatePhone(idx, 'name_of_person', e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Рақами телефон"
                                        value={phone.phone_number || ''}
                                        onChange={(e) => updatePhone(idx, 'phone_number', e.target.value)}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all"
                        >
                            Бекор кардан
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold transition-all shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Нигоҳ доштан...' : 'Нигоҳ доштан'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function EditFormDialog({ isOpen, onClose, form, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        full_name: form?.full_name || '',
        last_name: form?.last_name || '',
        first_name: form?.first_name || '',
        father_name: form?.father_name || '',
        phone_number: form?.phone_number || '',
        address_region: form?.address_region || '',
        detailed_address: form?.detailed_address || '',
        application_purpose: form?.application_purpose || '',
        description: form?.description || '',
    });

    useEffect(() => {
        if (!isOpen || !form) return;
        setFormData({
            full_name: form.full_name || '',
            last_name: form.last_name || '',
            first_name: form.first_name || '',
            father_name: form.father_name || '',
            phone_number: form.phone_number || '',
            address_region: form.address_region || '',
            detailed_address: form.detailed_address || '',
            application_purpose: form.application_purpose || '',
            description: form.description || '',
        });
        setError(null);
    }, [isOpen, form]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form?.id) return;

        setLoading(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                full_name: formData.full_name.trim() || null,
            };
            await api.patch(`/forms/${form.id}/`, payload);
            onSuccess?.();
            onClose();
        } catch (err) {
            const backendError =
                err.response?.data?.detail ||
                Object.values(err.response?.data || {}).flat().join(' ') ||
                'Маълумот нигоҳ дошта нашуд';
            setError(String(backendError));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold text-white">Таҳрири ариза</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">ID</label>
                            <input
                                type="text"
                                readOnly
                                value={form.id ?? ''}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-slate-400 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Рақами телефон
                            </label>
                            <input
                                type="text"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Номи пурра
                        </label>
                        <p className="text-xs text-slate-500 mb-2">Агар холӣ бошад, null сабт мешавад</p>
                        <input
                            type="text"
                            name="full_name"
                            maxLength={255}
                            value={formData.full_name}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Насаб (фамилия)</label>
                            <input
                                type="text"
                                name="last_name"
                                maxLength={255}
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Ном (ном)</label>
                            <input
                                type="text"
                                name="first_name"
                                maxLength={255}
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Номи падар (отчество)</label>
                            <input
                                type="text"
                                name="father_name"
                                maxLength={255}
                                value={formData.father_name}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Минтақа
                        </label>
                        <input
                            type="text"
                            name="address_region"
                            value={formData.address_region}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Суроғаи муфассал
                        </label>
                        <textarea
                            name="detailed_address"
                            value={formData.detailed_address}
                            onChange={handleChange}
                            rows={2}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Мақсади ариза
                        </label>
                        <input
                            type="text"
                            name="application_purpose"
                            value={formData.application_purpose}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Матни ариза
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all"
                        >
                            Бекор кардан
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold transition-all shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Нигоҳ доштан...' : 'Нигоҳ доштан'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
