'use client';

import {
    Bell,
    Menu,
    LogOut,
    User as UserIcon,
    ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useAuthStore from '@/store/useAuthStore';
import useAppStore from '@/store/useAppStore';
import { Button } from '@/components/ui/button';

export default function Header({ setIsSidebarOpen }) {
    const { user, logout } = useAuthStore();
    const { notifications } = useAppStore();
    const router = useRouter();

    const [isUserOpen, setIsUserOpen] = useState(false);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#0f172a]/80 px-6 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-4">
                {/* Hamburger Trigger for Mobile */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen && setIsSidebarOpen(true)}
                    className="md:hidden text-slate-400 hover:text-white hover:bg-white/5"
                >
                    <Menu className="h-6 w-6" />
                </Button>

                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        S
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">
                        Saliheen CRM
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Notifications */}
                <div className="relative group">
                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white hover:bg-white/5">
                        <Bell className="h-5 w-5" />
                        {notifications.length > 0 && (
                            <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        )}
                    </Button>

                    {/* Notification Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-80 translate-y-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50">
                        <div className="rounded-xl border border-white/10 bg-[#1e293b]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                                <h3 className="font-semibold text-slate-200 text-sm">Notifications</h3>
                                <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">{notifications.length} New</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map((notif) => (
                                        <div key={notif.id} className="px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="text-sm font-medium text-slate-200">{notif.title}</h4>
                                                <span className="text-[10px] text-slate-500">{notif.time}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-2">{notif.message}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                                        No new notifications
                                    </div>
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <div className="px-4 py-2 border-t border-white/5 bg-white/5 text-center">
                                    <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">Mark all as read</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* User Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsUserOpen(!isUserOpen)}
                        className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1 pl-4 pr-2 transition-all hover:bg-white/10 hover:border-white/20"
                    >
                        <div className="flex flex-col items-end text-xs hidden sm:flex">
                            <span className="font-semibold text-slate-200">{user?.username || 'Admin'}</span>
                            <span className="text-slate-400">Manager</span>
                        </div>

                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200 shadow-inner border border-white/5">
                            <span className="text-sm font-bold">
                                {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
                            </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isUserOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Custom Glass Dropdown */}
                    {isUserOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsUserOpen(false)}
                            />
                            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#1e293b]/90 backdrop-blur-xl p-2 text-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    My Account
                                </div>
                                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5 transition-colors">
                                    <UserIcon className="h-4 w-4 text-blue-400" />
                                    Profile
                                </button>
                                <div className="h-px bg-white/10 my-1" />
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
