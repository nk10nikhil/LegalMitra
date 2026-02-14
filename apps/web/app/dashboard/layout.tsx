'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@legalmitra/ui';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/profile', label: 'Profile' },
  { href: '/dashboard/track', label: 'Track Case' },
  { href: '/dashboard/cases', label: 'My Cases' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

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
              {navItems.map((item) => (
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
