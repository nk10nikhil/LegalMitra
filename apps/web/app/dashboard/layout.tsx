'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@legalmitra/ui';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

type Profile = {
  id: string;
  role: 'citizen' | 'lawyer' | 'judge' | 'admin';
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ['profile-layout'],
    queryFn: async () => (await api.get<Profile>('/profiles/me')).data,
  });

  const roleHome = data?.role ? `/dashboard/${data.role}` : '/dashboard';
  const items = [
    { href: roleHome, label: t('roleDashboard') },
    { href: '/dashboard/ask', label: t('askLegalAI') },
    { href: '/dashboard/documents', label: t('myDocuments') },
    { href: '/dashboard/summarize', label: t('summarizeJudgment') },
    { href: '/dashboard/case-laws', label: t('caseLawSearch') },
    { href: '/dashboard/profile', label: t('profile') },
    { href: '/dashboard/track', label: t('trackCase') },
    { href: '/dashboard/cases', label: t('myCases') },
    { href: '/dashboard/hearings', label: t('hearings') },
    { href: '/dashboard/notifications', label: t('notifications') },
    { href: '/dashboard/audit', label: t('auditTrail') },
    { href: '/dashboard/reports', label: t('myReports') },
    { href: '/dashboard/odr', label: t('odrRooms') },
    { href: '/dashboard/integrations', label: 'Integrations' },
  ];

  useEffect(() => {
    if (!data?.id) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000', {
      auth: { userId: data.id },
      transports: ['websocket'],
    });

    socket.emit('join_user_room', { userId: data.id });

    socket.on('case.updated', () => {
      toast.info('Case updated. Refresh your view for latest status.');
    });

    socket.on('hearing.scheduled', () => {
      toast.info('New hearing scheduled.');
    });

    socket.on('hearing.status_updated', () => {
      toast.info('Hearing status updated.');
    });

    socket.on('notification.read_all', () => {
      toast.success('Notifications marked as read.');
    });

    return () => {
      socket.disconnect();
    };
  }, [data?.id]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="border-b bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <nav aria-label="Primary" className="flex flex-wrap items-center gap-4 text-sm">
              {items.map((item) => (
                <Link
                  className="text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-slate-100"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
              <Button onClick={logout} variant="outline">
                {t('logout')}
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8" id="main-content">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
