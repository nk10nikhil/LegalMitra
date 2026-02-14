'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@legalmitra/ui';
import { api } from '@/lib/api';

type Case = {
  id: string;
  caseNumber: string;
  courtCode: string;
  status: string;
  nextHearing: string | null;
  lastSynced: string;
};

export default function CasesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cases'],
    queryFn: async () => (await api.get<Case[]>('/cases')).data,
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading cases...</p>;
  }

  if (isError) {
    return <p className="text-sm text-rose-600">Failed to load cases.</p>;
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">My Cases</h1>
      {!data?.length ? <Card>No cases tracked yet.</Card> : null}
      <div className="grid gap-3">
        {data?.map((item) => (
          <Link href={`/dashboard/cases/${item.id}`} key={item.id}>
            <Card className="space-y-1 hover:border-slate-400">
              <p className="font-medium">{item.caseNumber}</p>
              <p className="text-sm text-slate-600">Court: {item.courtCode}</p>
              <p className="text-sm text-slate-600">Status: {item.status}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
