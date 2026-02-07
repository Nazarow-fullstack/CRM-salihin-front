'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Calendar,
    User,
    Phone,
    MapPin,
    FileText,
    MessageSquare,
    Clock,
    CheckCircle,
    Send,
    MoreVertical,
    File,
    Download,
    AlertCircle
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- Constants ---
const STATUS_CONFIG = {
    new_message: { label: 'Паёми нав', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    submitted: { label: 'Пуркардани анкета', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    under_review: { label: 'Кумита', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    to_accountant: { label: 'Бухгалтерия', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
    rejected: { label: 'Рад', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    approved: { label: 'Кумакшуда', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    family_video: { label: 'Видеои', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
    help_later: { label: 'Баъдтар', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    bank_card: { label: 'Ҳуҷҷат', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    deleted: { label: 'Удалит', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

// --- Components ---

const InfoCard = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
        <div className="p-2 rounded-lg bg-white/5 border border-white/5">
            <Icon className="h-5 w-5 text-slate-400" />
        </div>
        <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-medium text-slate-200 mt-1">{value || 'N/A'}</p>
        </div>
    </div>
);

const TimelineItem = ({ date, title, description, active }) => (
    <div className="relative pl-6 pb-6 border-l border-white/10 last:pb-0">
        <div className={cn(
            "absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full ring-4 ring-[#0f172a]",
            active ? "bg-primary" : "bg-slate-700"
        )} />
        <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 font-mono">{date}</span>
            <h4 className="text-sm font-medium text-slate-300">{title}</h4>
            {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
    </div>
);

export default function ApplicationDetailPage() {
    const params = useParams();
    const id = params?.id;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(null);
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [activeTab, setActiveTab] = useState('details'); // details, family, docs

    // Fetch Data
    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine if we should mock (if API fails or just for dev)
                // Integrating real API call:
                const response = await api.get(`/forms/${id}/`).catch(() => null);

                if (response?.data) {
                    setForm(response.data);
                } else {
                    // Mock Fallback
                    await new Promise(r => setTimeout(r, 800)); // Simulate delay
                    setForm({
                        id: id,
                        full_name: 'Davlatov Sherzod',
                        phone: '+992 900 12 34 56',
                        status: 'under_review',
                        region: 'Dushanbe',
                        address: 'Rudaki Ave 12, Apt 45',
                        purpose: 'Business Loan',
                        description: 'Requesting funds to expand small bakery business. Need equipment upgrade.',
                        created_at: '2023-10-25T10:30:00Z',
                        birth_date: '1990-05-15',
                        family_members: 5,
                        income_level: 'Low',
                        history: [
                            { date: '2023-10-25 10:30', title: 'Application Submitted', active: true },
                            { date: '2023-10-26 09:15', title: 'Review Started', active: true },
                            { date: '2023-10-27 14:20', title: 'Documents Requested', active: false },
                        ]
                    });
                    setNotes([
                        { id: 1, text: 'Called applicant, verified address.', user: 'Admin', time: '10:45 AM' },
                        { id: 2, text: 'Waiting for bank statement.', user: 'System', time: '11:00 AM' }
                    ]);
                }
            } catch (error) {
                console.error("Error fetching detail:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleSendNote = () => {
        if (!newNote.trim()) return;
        setNotes([...notes, { id: Date.now(), text: newNote, user: 'You', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setNewNote('');
    };

    if (loading) {
        return (
            <div className="h-[80vh] w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 animate-pulse">Loading Application...</p>
                </div>
            </div>
        );
    }

    if (!form) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-slate-500">
                <AlertCircle className="h-12 w-12" />
                <p>Application found or access denied.</p>
                <Button onClick={() => router.back()} variant="outline">Go Back</Button>
            </div>
        );
    }

    const statusInfo = STATUS_CONFIG[form.status] || STATUS_CONFIG['new_message'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* --- Sticky Header --- */}
            <div className="sticky top-0 z-30 -mx-6 -mt-6 px-6 py-4 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="hover:bg-white/10 text-slate-400 hover:text-white rounded-full"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-white">Application #{form.id}</h1>
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-md shadow-sm",
                                statusInfo.color
                            )}>
                                {statusInfo.label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created on {new Date(form.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-white/10 hover:bg-white/5 text-slate-300 text-xs h-9">
                        <Download className="mr-2 h-3 w-3" /> Export PDF
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 text-white text-xs h-9">
                        Edit
                    </Button>
                </div>
            </div>

            {/* --- Main Content Grid --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Navigation Tabs */}
                    <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
                        {['details', 'family', 'docs'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    activeTab === tab
                                        ? "bg-primary text-white shadow-lg"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[400px]">
                        <AnimatePresence mode="wait">
                            {activeTab === 'details' && (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    {/* Personal Info Group */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <InfoCard icon={User} label="Full Name" value={form.full_name} />
                                        <InfoCard icon={Phone} label="Phone Number" value={form.phone} />
                                        <InfoCard icon={MapPin} label="Region" value={form.region} />
                                        <InfoCard icon={MapPin} label="Address" value={form.address} />
                                        <InfoCard icon={Calendar} label="Date of Birth" value={form.birth_date} />
                                        <InfoCard icon={User} label="Family Size" value={`${form.family_members || 0} Members`} />
                                    </div>

                                    {/* Purpose / Description */}
                                    <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-primary" />
                                            Purpose of Application
                                        </h3>
                                        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                                            <span className="text-xs font-bold text-primary tracking-wider uppercase mb-2 block">{form.purpose}</span>
                                            <p className="text-slate-300 leading-relaxed text-sm">
                                                {form.description || "No description provided."}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'family' && (
                                <motion.div
                                    key="family"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-8 text-center border border-white/10 rounded-2xl bg-white/5"
                                >
                                    <User className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                    <h3 className="text-slate-300 font-medium">Family Data Module</h3>
                                    <p className="text-slate-500 text-sm">Polls and family member details will appear here.</p>
                                </motion.div>
                            )}

                            {activeTab === 'docs' && (
                                <motion.div
                                    key="docs"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                                >
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="aspect-square rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 cursor-pointer transition-colors group">
                                            <File className="h-8 w-8 text-slate-500 group-hover:text-primary transition-colors" />
                                            <span className="text-xs text-slate-400">Document_{i}.pdf</span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Column (1/3) */}
                <div className="space-y-6">

                    {/* Status Management */}
                    <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Actions</h3>
                        <div className="space-y-3">
                            <select className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary">
                                <option>Change Status...</option>
                                <option value="approved">Approve Application</option>
                                <option value="rejected">Reject Application</option>
                                <option value="under_review">Send to Committee</option>
                            </select>
                            <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10">
                                Verify Documents
                            </Button>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">History</h3>
                        <div className="space-y-0">
                            {form.history?.map((item, idx) => (
                                <TimelineItem key={idx} {...item} />
                            ))}
                        </div>
                    </div>

                    {/* Notes / Chat */}
                    <div className="flex flex-col h-[400px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                        <div className="p-4 border-b border-white/10 bg-white/5">
                            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" /> Notes & Activity
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                            {notes.length === 0 && (
                                <p className="text-center text-xs text-slate-600 mt-10">No notes yet.</p>
                            )}
                            {notes.map(note => (
                                <div key={note.id} className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                                        <span className="font-bold text-slate-400">{note.user}</span>
                                        <span>{note.time}</span>
                                    </div>
                                    <div className="bg-white/10 p-2.5 rounded-lg rounded-tl-none border border-white/5 text-sm text-slate-200">
                                        {note.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 bg-black/20 border-t border-white/10">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSendNote(); }}
                                className="flex gap-2"
                            >
                                <Input
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add a note..."
                                    className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-slate-600 px-0"
                                />
                                <Button size="icon" type="submit" className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 shrink-0">
                                    <Send className="h-3 w-3" />
                                </Button>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

