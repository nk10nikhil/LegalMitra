'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@legalmitra/ui';
import { api } from '@/lib/api';

type CaseItem = { id: string; status: string };
type HearingItem = { id: string; status: string };
type AuditItem = { id: string; action: string; createdAt: string };

export default function LawyerDashboardPage() {
  const { data: cases } = useQuery({
    queryKey: ['lawyer-cases-overview'],
    queryFn: async () => (await api.get<CaseItem[]>('/cases')).data,
  });

  const { data: hearings } = useQuery({
    queryKey: ['lawyer-hearings-overview'],
    queryFn: async () => (await api.get<HearingItem[]>('/hearings')).data,
  });

  const { data: audit } = useQuery({
    queryKey: ['lawyer-audit-overview'],
    queryFn: async () => (await api.get<AuditItem[]>('/audit-logs?limit=10')).data,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Lawyer Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-600">Assigned/Tracked Cases</p>
          <p className="text-2xl font-semibold">{cases?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Scheduled Hearings</p>
          <p className="text-2xl font-semibold">
            {hearings?.filter((item) => item.status === 'scheduled').length ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Recent Actions</p>
          <p className="text-2xl font-semibold">{audit?.length ?? 0}</p>
        </Card>
      </div>

      <Card className="space-y-2">
        <h2 className="text-lg font-medium">Latest Activity</h2>
        {!audit?.length ? (
          <p className="text-sm text-slate-600">No activity yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {audit.map((item) => (
              <li key={item.id}>
                {item.action} • {new Date(item.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
