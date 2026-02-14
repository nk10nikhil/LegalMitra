'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card } from '@legalmitra/ui';
import { api } from '@/lib/api';

type Profile = {
  role: 'citizen' | 'lawyer' | 'judge' | 'admin';
};

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['profile-dashboard-root'],
    queryFn: async () => (await api.get<Profile>('/profiles/me')).data,
  });

  useEffect(() => {
    if (data?.role) {
      router.replace(`/dashboard/${data.role}`);
    }
  }, [data?.role, router]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Card>
        <h2 className="font-medium">Phase 1 Ready</h2>
        <p className="mt-2 text-sm text-slate-600">
          Track your cases from eCourts, monitor hearing updates, and manage your profile in one
          place.
        </p>
      </Card>
    </section>
  );
}
