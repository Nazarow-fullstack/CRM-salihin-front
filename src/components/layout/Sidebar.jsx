'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useAuthStore from '@/store/useAuthStore';
import useAppStore from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Grid,
    Users,
    Settings,
    LogOut,
    ClipboardList,
    CreditCard,
    Building,
    X
} from 'lucide-react';

const navItems = [
    { name: 'Аналитика', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Дархостҳо', href: '/dashboard/applications', icon: Grid },
    { name: 'Оилаҳо', href: '/dashboard/families', icon: Users },
    { name: 'Кумита', href: '/dashboard/committee', icon: Users },
    { name: 'Бухгалтерия', href: '/dashboard/accounting', icon: CreditCard },
    { name: 'Барномахо', href: '/dashboard/', icon: ClipboardList },
    { name: 'Корбар', href: '/dashboard/users', icon: Settings },
    { name: 'Фаъолияти корбарон', href: '/dashboard/user-activity', icon: Building },
];

export default function Sidebar({ isOpen = false, setIsOpen }) {
    const pathname = usePathname();
    const { logout } = useAuthStore();
    const { onlineUsers } = useAppStore();

    // Close mobile sidebar on route change
    useEffect(() => {
        if (isOpen && setIsOpen) {
            setIsOpen(false);
        }
    }, [pathname, setIsOpen]);

    // Backdrop for mobile - lighter and less intrusive
    const Backdrop = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen && setIsOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
        />
    );

    const SidebarContent = (
        <div className="flex flex-col h-full bg-slate-900 border-r border-white/10">
            {/* Header with Gradient */}
            <div className="relative overflow-hidden p-6 border-b border-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />

                <div className="relative flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        CRM Pro
                    </h1>
                    {/* Close Button Mobile Only */}
                    <button
                        onClick={() => setIsOpen && setIsOpen(false)}
                        className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const isActive = item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white font-semibold shadow-lg border border-blue-500/30"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse" />
                            )}
                            <Icon className={cn(
                                "h-5 w-5 transition-colors relative z-10",
                                isActive ? "text-blue-400" : "text-slate-500 group-hover:text-white"
                            )} />
                            <span className="relative z-10">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Online Users Widget */}
            <div className="px-4 py-3">
                <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            <span className="text-sm font-semibold text-emerald-400">
                                {Array.isArray(onlineUsers) ? onlineUsers.length : (onlineUsers?.count || 0)} онлайн
                            </span>
                        </div>
                        {(Array.isArray(onlineUsers) && onlineUsers.length > 0) || (onlineUsers?.users?.length > 0) ? (
                            <p className="text-xs text-slate-400 line-clamp-2">
                                {Array.isArray(onlineUsers)
                                    ? onlineUsers.map(u => u.username || u.name || 'User').join(', ')
                                    : onlineUsers?.users?.map(u => u.username).join(', ')
                                }
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500">No users online</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Logout Button */}
            <div className="p-4 border-t border-white/10">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-red-500/20 hover:border-red-500/40 group"
                >
                    <LogOut className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar - Static */}
            <div className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 z-40 bg-slate-900 border-r border-white/10">
                {SidebarContent}
            </div>

            {/* Mobile Sidebar - Slide in */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <Backdrop key="backdrop" />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-y-0 left-0 z-50 w-64 md:hidden shadow-2xl"
                        >
                            {SidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
