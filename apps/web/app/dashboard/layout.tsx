'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@legalmitra/ui';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type Profile = {
  role: 'citizen' | 'lawyer' | 'judge' | 'admin';
};

const navItems = (roleHome: string) => [
  { href: roleHome, label: 'Role Dashboard' },
  { href: '/dashboard/ask', label: 'Ask Legal AI' },
  { href: '/dashboard/profile', label: 'Profile' },
  { href: '/dashboard/track', label: 'Track Case' },
  { href: '/dashboard/cases', label: 'My Cases' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['profile-layout'],
    queryFn: async () => (await api.get<Profile>('/profiles/me')).data,
  });

  const roleHome = data?.role ? `/dashboard/${data.role}` : '/dashboard';

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
