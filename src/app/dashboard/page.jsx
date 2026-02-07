'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    MessageSquare,
    FileText,
    Gavel,
    XCircle,
    Landmark,
    Clock,
    CheckCircle2,
    Video,
    CreditCard,
    Trash2,
    BarChart3,
    TrendingUp
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import api from '@/lib/axios';
import useAppStore from '@/store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Status Configuration with Tajik labels and colors
const STATUS_CONFIG = {
    new_message: { icon: MessageSquare, color: '#FFA726', label: 'Паёми нав' },
    submitted: { icon: FileText, color: '#42A5F5', label: 'Пуркардани анкета' },
    under_review: { icon: Gavel, color: '#AB47BC', label: 'Кумита' },
    to_accountant: { icon: Landmark, color: '#26A69A', label: 'Бухгалтерия' },
    rejected: { icon: XCircle, color: '#EF5350', label: 'Рад карда шуд' },
    approved: { icon: CheckCircle2, color: '#66BB6A', label: 'Бомуваффакият Кӯмак карда шуд' },
    family_video: { icon: Video, color: '#EC407A', label: 'Видеои кандидат оила' },
    help_later: { icon: Clock, color: '#78909C', label: 'Баъдтар кӯмак мекунем' },
    bank_card: { icon: CreditCard, color: '#FFEB3B', label: 'Рақами банкии карт' },
    deleted: { icon: Trash2, color: '#9CA3AF', label: 'Удалит' },
};

export default function DashboardPage() {
    const { recentActivity } = useAppStore();
    const [stats, setStats] = useState({
        statusData: [],
        monthlyData: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/dashboard-stats/');
                setStats({
                    statusData: res.data.statusData || [],
                    monthlyData: res.data.monthlyData || []
                });
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse p-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-32 bg-slate-800 rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >



            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div className="lg:col-span-2" variants={itemVariants}>
                    <Card className="h-full border border-white/10 bg-slate-900 backdrop-blur-xl shadow-xl">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <BarChart3 className="h-6 w-6 text-purple-400" />
                                <div>
                                    <CardTitle className="text-white">Таҳлили маълумот</CardTitle>
                                    <CardDescription className="text-slate-400">Маълумоти моҳона</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#ffffff', opacity: 0.05 }}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                backgroundColor: '#0f172a',
                                                color: '#fff',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Bar
                                            dataKey="count"
                                            name="Ариза"
                                            fill="#8B5CF6"
                                            radius={[4, 4, 0, 0]}
                                            barSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Recent Activity Widget */}
                <motion.div className="lg:col-span-1" variants={itemVariants}>
                    <Card className="h-full border border-white/10 bg-slate-900 backdrop-blur-xl shadow-xl flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <TrendingUp className="h-5 w-5 text-blue-400" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription className="text-slate-400">Latest actions in the system</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                            <div className="space-y-4">
                                {recentActivity && recentActivity.length > 0 ? (
                                    recentActivity.map((item) => (
                                        <div
                                            key={item.id}
                                            className="group flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/5"
                                        >
                                            <div className="flex-shrink-0 mt-1">
                                                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors">
                                                    <span className="text-xs font-bold text-slate-300 group-hover:text-blue-400">
                                                        {item.user.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                                                    {item.action}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-slate-400">
                                                    <span className="font-medium text-slate-400">{item.user}</span>
                                                    <span>•</span>
                                                    <span>{item.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full py-10 text-slate-500">
                                        <Clock className="h-8 w-8 mb-2 opacity-50" />
                                        <p className="text-sm">No recent activity</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
                        {/* Dynamic Status Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 " >
                {stats.statusData.map((status) => {
                    const config = STATUS_CONFIG[status.name] || {
                        icon: FileText,
                        color: '#334155',
                        label: status.name
                    };

                    return (
                        <StatsCard
                            key={status.name}
                            title={config.label}
                            value={status.value}
                            icon={config.icon}
                            iconColor={config.color}
                            variants={itemVariants}
                        />
                    );
                })}
            </div>
        </motion.div>
    );
}

function StatsCard({ title, value, icon: Icon, iconColor, variants }) {
    return (
        <motion.div variants={variants}>
            <Card className="overflow-hidden border border-white/10 bg-slate-900 backdrop-blur-xl shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                        <Icon
                            className="h-10 w-10 transition-transform duration-300 group-hover:scale-110"
                            style={{ color: iconColor }}
                        />
                    </div>
                    <p className="text-sm font-medium text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis mb-2">
                        {title}
                    </p>
                    <h3 className="text-3xl font-bold text-slate-100">
                        {value}
                    </h3>
                </CardContent>
            </Card>
        </motion.div>
    );
}
