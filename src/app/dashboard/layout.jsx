'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/useAuthStore';
import useAppStore from '@/store/useAppStore';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }) {
    const router = useRouter();
    const { token, isLoading: authLoading } = useAuthStore();
    const { initPolling, stopPolling } = useAppStore();
    const [mounted, setMounted] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !token) {
            router.push('/login');
        }
    }, [mounted, token, router]);

    useEffect(() => {
        if (token) {
            initPolling();
        }
        return () => stopPolling();
    }, [token, initPolling, stopPolling]);

    if (!mounted || !token) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Main Content Wrapper */}
            <main className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
                <Header setIsSidebarOpen={setIsSidebarOpen} />
                <div className="p-6 flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
