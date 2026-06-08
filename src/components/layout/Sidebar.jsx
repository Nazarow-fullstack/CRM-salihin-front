'use client';

import { useEffect, useState } from 'react';
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
    CreditCard,
    X,
    ChevronDown,
    Activity,
    UserCog,
} from 'lucide-react';

const navItems = [
    { name: 'Аналитика',   href: '/dashboard',            icon: LayoutDashboard },
    { name: 'Дархостҳо',   href: '/dashboard/applications', icon: Grid },
    { name: 'Оилаҳо',      href: '/dashboard/families',   icon: Users },
    { name: 'Кумита',      href: '/dashboard/committee',  icon: Users },
    { name: 'Бухгалтерия', href: '/dashboard/accounting', icon: CreditCard },
    {
        name: 'Корбар',
        icon: Settings,
        children: [
            { name: 'Корбарон',              href: '/dashboard/users',         icon: UserCog },
            { name: 'Фаъолияти корбарон',    href: '/dashboard/user-activity', icon: Activity },
        ],
    },
];

export default function Sidebar({ isOpen = false, setIsOpen }) {
    const pathname = usePathname();
    const { logout } = useAuthStore();
    const { onlineUsers } = useAppStore();

    // Keep user group open if any child is active
    const userGroupActive =
        pathname.startsWith('/dashboard/users') ||
        pathname.startsWith('/dashboard/user-activity');

    const [userGroupOpen, setUserGroupOpen] = useState(userGroupActive);

    // Close mobile sidebar on route change
    useEffect(() => {
        if (isOpen && setIsOpen) setIsOpen(false);
    }, [pathname, setIsOpen]);

    // Auto-open group when navigating to a child route
    useEffect(() => {
        if (userGroupActive) setUserGroupOpen(true);
    }, [userGroupActive]);

    const SidebarContent = (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10">
            {/* Header */}
            <div className="relative overflow-hidden p-6 border-b border-slate-200 dark:border-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        CRM Pro
                    </h1>
                    <button
                        onClick={() => setIsOpen && setIsOpen(false)}
                        className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    // --- Group item (has children) ---
                    if (item.children) {
                        const Icon = item.icon;
                        const isGroupActive = item.children.some(
                            (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
                        );

                        return (
                            <div key={item.name}>
                                <button
                                    onClick={() => setUserGroupOpen((v) => !v)}
                                    className={cn(
                                        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                        isGroupActive
                                            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-slate-900 dark:text-white font-semibold shadow-lg border border-blue-500/30"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                                    )}
                                >
                                    {isGroupActive && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse" />
                                    )}
                                    <Icon className={cn(
                                        "h-5 w-5 transition-colors relative z-10",
                                        isGroupActive ? "text-blue-500 dark:text-blue-400" : "text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white"
                                    )} />
                                    <span className="relative z-10 flex-1 text-left">{item.name}</span>
                                    <ChevronDown className={cn(
                                        "h-4 w-4 relative z-10 transition-transform duration-200",
                                        userGroupOpen ? "rotate-180" : ""
                                    )} />
                                </button>

                                <AnimatePresence initial={false}>
                                    {userGroupOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 dark:border-white/10 pl-3">
                                                {item.children.map((child) => {
                                                    const ChildIcon = child.icon;
                                                    const isChildActive =
                                                        pathname === child.href ||
                                                        pathname.startsWith(`${child.href}/`);
                                                    return (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            className={cn(
                                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm",
                                                                isChildActive
                                                                    ? "bg-blue-500/15 text-slate-900 dark:text-white font-semibold border border-blue-500/20"
                                                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            <ChildIcon className={cn(
                                                                "h-4 w-4 transition-colors",
                                                                isChildActive ? "text-blue-500 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                                                            )} />
                                                            <span>{child.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    }

                    // --- Regular item ---
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
                                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-slate-900 dark:text-white font-semibold shadow-lg border border-blue-500/30"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse" />
                            )}
                            <Icon className={cn(
                                "h-5 w-5 transition-colors relative z-10",
                                isActive ? "text-blue-500 dark:text-blue-400" : "text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white"
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
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {Array.isArray(onlineUsers)
                                    ? onlineUsers.map(u => u.username || u.name || 'Корбар').join(', ')
                                    : onlineUsers?.users?.map(u => u.username).join(', ')
                                }
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500">Корбаре онлайн нест</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Logout Button */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-red-500/20 hover:border-red-500/40 group"
                >
                    <LogOut className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                    <span className="font-medium">Баромад</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10">
                {SidebarContent}
            </div>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen && setIsOpen(false)}
                            className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
                        />
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
