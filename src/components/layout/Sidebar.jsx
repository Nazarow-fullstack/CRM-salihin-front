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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Applications', href: '/dashboard/applications', icon: Grid },
    { name: 'Families', href: '/dashboard/families', icon: Users },
    { name: 'Committee', href: '/dashboard/committee', icon: Users },
    { name: 'Accounting', href: '/dashboard/accounting', icon: CreditCard },
    { name: 'Programs', href: '/dashboard/programs', icon: ClipboardList },
    { name: 'Users', href: '/dashboard/users', icon: Settings },
    { name: 'Activity', href: '/dashboard/activity', icon: Building },
];

export default function Sidebar({ isOpen = false, setIsOpen }) {
    const pathname = usePathname();
    const { logout } = useAuthStore();
    const { onlineUsers } = useAppStore();
    console.log(onlineUsers);

    // Close mobile sidebar on route change
    useEffect(() => {
        if (isOpen && setIsOpen) {
            setIsOpen(false);
        }
    }, [pathname, setIsOpen]);

    // Backdrop for mobile
    const Backdrop = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen && setIsOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        />
    );

    const SidebarContent = (
        <div className="flex flex-col h-full  backdrop-blur-xl border-r border-white/10">
            <div className="p-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    CRM Pro
                </h1>
                {/* Close Button Mobile Only */}
                <button
                    onClick={() => setIsOpen && setIsOpen(false)}
                    className="md:hidden text-slate-400 hover:text-white"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    // Fix: Exact match for root dashboard, startsWith for sub-routes
                    const isActive = item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    const Icon = item.icon;     

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-primary/10 text-primary font-medium shadow-sm border border-primary/20"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground")} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Online Users Widget */}
            <div className="px-4 py-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                        <span className="text-sm font-semibold text-emerald-900/90">
                            {Array.isArray(onlineUsers) ? onlineUsers.length : (onlineUsers?.count || 0)} онлайн
                        </span>
                    </div>
                    {(Array.isArray(onlineUsers) && onlineUsers.length > 0) || (onlineUsers?.users?.length > 0) ? (
                        <p className="text-xs text-emerald-900/90 line-clamp-2">
                            {Array.isArray(onlineUsers)
                                ? onlineUsers.map(u => u.username || u.name || 'User').join(', ')
                                : onlineUsers?.users?.map(u => u.username).join(', ')
                            }
                        </p>
                    ) : (
                        <p className="text-xs text-emerald-200/50">No users online</p>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar - Static */}
            <div className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 z-40 bg-card border-r border-border">
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
