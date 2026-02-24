'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/axios';

export function EditPollDialog({ isOpen, onClose, poll, formId, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        family_members: poll?.family_members || '',
        financial_status: poll?.financial_status || '',
        data_of_birth: poll?.data_of_birth || '',
        profession_jobs: poll?.profession_jobs || '',
        monthly_income: poll?.monthly_income || '',
        yarim_reason: poll?.yarim_reason || '',
    });

    const [familyWorkers, setFamilyWorkers] = useState(poll?.family_workers || []);
    const [familyPhones, setFamilyPhones] = useState(poll?.family_phone_numbers || []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!poll?.id) return;

        setLoading(true);
        setError(null);

        try {
            // Update poll data
            await api.patch(`/polls/${poll.id}/`, formData);

            // Delete existing family workers and add new ones
            if (poll.family_workers) {
                await Promise.all(
                    poll.family_workers.map(worker =>
                        api.delete(`/family-workers/${worker.id}/`)
                    )
                );
            }

            // Add new family workers
            await Promise.all(
                familyWorkers.map(worker =>
                    api.post('/family-workers/', { ...worker, poll: poll.id })
                )
            );

            // Delete existing phones and add new ones
            if (poll.family_phone_numbers) {
                await Promise.all(
                    poll.family_phone_numbers.map(phone =>
                        api.delete(`/familyphonenumber/${phone.id}/`)
                    )
                );
            }

            // Add new phones
            await Promise.all(
                familyPhones.map(phone =>
                    api.post('/familyphonenumber/', { ...phone, poll: poll.id })
                )
            );

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error updating poll:', err);
            setError('Failed to update survey data');
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
                                value={formData.family_members}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Маъоши моҳона
                            </label>
                            <input
                                type="number"
                                name="monthly_income"
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
                                value={formData.data_of_birth}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Кор / Касб
                            </label>
                            <input
                                type="text"
                                name="profession_jobs"
                                value={formData.profession_jobs}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                            <option value="" disabled>Интихоб кунед</option>
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
                                onClick={() => setFamilyWorkers([...familyWorkers, { person: '', name: '', job: '', monthly_income: '', data_of_birth: '' }])}
                                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>
                        {familyWorkers.map((worker, idx) => (
                            <div key={idx} className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-3">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-white">Аъзои оила #{idx + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => setFamilyWorkers(familyWorkers.filter((_, i) => i !== idx))}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Аъзо"
                                        value={worker.person}
                                        onChange={(e) => {
                                            const updated = [...familyWorkers];
                                            updated[idx].person = e.target.value;
                                            setFamilyWorkers(updated);
                                        }}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Номи аъзо"
                                        value={worker.name}
                                        onChange={(e) => {
                                            const updated = [...familyWorkers];
                                            updated[idx].name = e.target.value;
                                            setFamilyWorkers(updated);
                                        }}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Кор / Касб"
                                        value={worker.job}
                                        onChange={(e) => {
                                            const updated = [...familyWorkers];
                                            updated[idx].job = e.target.value;
                                            setFamilyWorkers(updated);
                                        }}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <input
                                        type="date"
                                        placeholder="Санаи таваллуд"
                                        value={worker.data_of_birth}
                                        onChange={(e) => {
                                            const updated = [...familyWorkers];
                                            updated[idx].data_of_birth = e.target.value;
                                            setFamilyWorkers(updated);
                                        }}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Маъоши моҳона"
                                        value={worker.monthly_income}
                                        onChange={(e) => {
                                            const updated = [...familyWorkers];
                                            updated[idx].monthly_income = e.target.value;
                                            setFamilyWorkers(updated);
                                        }}
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
                                onClick={() => setFamilyPhones([...familyPhones, { name_of_person: '', phone_number: '' }])}
                                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>
                        {familyPhones.map((phone, idx) => (
                            <div key={idx} className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-3">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-white">Рақами телефони #{idx + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => setFamilyPhones(familyPhones.filter((_, i) => i !== idx))}
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
                                        onChange={(e) => {
                                            const updated = [...familyPhones];
                                            updated[idx].name_of_person = e.target.value;
                                            setFamilyPhones(updated);
                                        }}
                                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Рақами телефон"
                                        value={phone.phone_number || ''}
                                        onChange={(e) => {
                                            const updated = [...familyPhones];
                                            updated[idx].phone_number = e.target.value;
                                            setFamilyPhones(updated);
                                        }}
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
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold transition-all shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
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
        phone_number: form?.phone_number || '',
        address_region: form?.address_region || '',
        detailed_address: form?.detailed_address || '',
        application_purpose: form?.application_purpose || '',
        description: form?.description || '',
    });

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
            await api.patch(`/forms/${form.id}/`, formData);
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error updating form:', err);
            setError('Failed to update application');
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
                    <h2 className="text-2xl font-bold text-white">Edit Application</h2>
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
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Phone Number
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
                            Region
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
                            Detailed Address
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
                            Application Purpose
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
                            Description
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
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold transition-all shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
