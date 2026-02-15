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

type Profile = {
  id: string;
  role: 'citizen' | 'lawyer' | 'judge' | 'admin';
};

const navItems = (roleHome: string) => [
  { href: roleHome, label: 'Role Dashboard' },
  { href: '/dashboard/ask', label: 'Ask Legal AI' },
  { href: '/dashboard/documents', label: 'My Documents' },
  { href: '/dashboard/summarize', label: 'Summarize Judgment' },
  { href: '/dashboard/case-laws', label: 'Case Law Search' },
  { href: '/dashboard/profile', label: 'Profile' },
  { href: '/dashboard/track', label: 'Track Case' },
  { href: '/dashboard/cases', label: 'My Cases' },
  { href: '/dashboard/hearings', label: 'Hearings' },
  { href: '/dashboard/notifications', label: 'Notifications' },
  { href: '/dashboard/audit', label: 'Audit Trail' },
  { href: '/dashboard/reports', label: 'My Reports' },
  { href: '/dashboard/odr', label: 'ODR Rooms' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['profile-layout'],
    queryFn: async () => (await api.get<Profile>('/profiles/me')).data,
  });

  const roleHome = data?.role ? `/dashboard/${data.role}` : '/dashboard';

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
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <nav className="flex flex-wrap items-center gap-4 text-sm">
              {navItems(roleHome).map((item) => (
                <Link
                  className="text-slate-700 hover:text-slate-900"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
