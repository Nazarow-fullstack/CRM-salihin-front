'use client';

import { useState, useEffect } from 'react';
import {
    User,
    Lock,
    Shield,
    Loader2,
    Save,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile, updateProfile, changePassword } from '@/services/api';

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [editData, setEditData] = useState({});

    // Password State
    const [pwData, setPwData] = useState({ old_password: '', new_password: '', new_password2: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' }); // success/error

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const response = await getProfile();
            setProfile(response.data);
            setEditData(response.data);
        } catch (error) {
            console.error("Failed to load profile", error);
            setMessage({ type: 'error', text: 'Failed to load profile data' });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await updateProfile(editData);
            setMessage({ type: 'success', text: 'Profile updated successfully' });
            await loadProfile();
        } catch (error) {
            console.error("Failed to update profile", error);
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (pwData.new_password !== pwData.new_password2) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setPwLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await changePassword(pwData);
            setMessage({ type: 'success', text: 'Password changed successfully' });
            setPwData({ old_password: '', new_password: '', new_password2: '' });
        } catch (error) {
            console.error("Password change failed", error);
            const errorMsg = error.response?.data?.old_password ||
                error.response?.data?.new_password ||
                'Failed to change password. Please check your old password.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setPwLoading(false);
        }
    };

    if (loading && !profile) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className="text-3xl font-bold text-white">Профили ман</h1>
                    <p className="text-slate-400">Танзимоти шахсӣ ва бехатарӣ</p>
                </motion.div>

                {/* Message Alert */}
                <AnimatePresence>
                    {message.text && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}
                        >
                            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <p>{message.text}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Details Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl"
                    >
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/5">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Маълумоти шахсӣ</h2>
                                <p className="text-slate-400 text-sm">Маълумоти асосии ҳисоб</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Номи корбар</label>
                                <input
                                    type="text"
                                    value={editData?.username || ''}
                                    onChange={e => setEditData({ ...editData, username: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-1 focus:ring-blue-500"
                                    disabled // Usually username is immutable or needs special perm
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Email</label>
                                <input
                                    type="email"
                                    value={editData?.email || ''}
                                    onChange={e => setEditData({ ...editData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleProfileUpdate}
                                    disabled={loading}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Сабт кардан</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Change Password Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl"
                    >
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/5">
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                                <Lock className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Иваз кардани парол</h2>
                                <p className="text-slate-400 text-sm">Барои бехатарӣ паролро нав кунед</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Пароли кӯҳна</label>
                                <input
                                    type="password"
                                    value={pwData.old_password}
                                    onChange={e => setPwData({ ...pwData, old_password: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Пароли нав</label>
                                <input
                                    type="password"
                                    value={pwData.new_password}
                                    onChange={e => setPwData({ ...pwData, new_password: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Пароли нав (Такрор)</label>
                                <input
                                    type="password"
                                    value={pwData.new_password2}
                                    onChange={e => setPwData({ ...pwData, new_password2: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handlePasswordChange}
                                    disabled={pwLoading}
                                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {pwLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Shield className="w-5 h-5" /> Иваз кардан</>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
