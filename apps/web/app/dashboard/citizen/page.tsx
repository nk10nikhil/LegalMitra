'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@legalmitra/ui';
import { api } from '@/lib/api';

type CaseItem = { id: string; status: string; nextHearing: string | null };
type HearingItem = { id: string; scheduledAt: string; status: string };
type NotificationItem = { id: string; read: boolean };

export default function CitizenDashboardPage() {
  const { data: cases } = useQuery({
    queryKey: ['citizen-cases-overview'],
    queryFn: async () => (await api.get<CaseItem[]>('/cases')).data,
  });

  const { data: hearings } = useQuery({
    queryKey: ['citizen-hearings-overview'],
    queryFn: async () => (await api.get<HearingItem[]>('/hearings')).data,
  });

  const { data: notifications } = useQuery({
    queryKey: ['citizen-notifications-overview'],
    queryFn: async () => (await api.get<NotificationItem[]>('/notifications')).data,
  });

  const unreadNotifications = notifications?.filter((item) => !item.read).length ?? 0;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Citizen Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-600">Tracked Cases</p>
          <p className="text-2xl font-semibold">{cases?.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Upcoming Hearings</p>
          <p className="text-2xl font-semibold">
            {hearings?.filter((item) => item.status === 'scheduled').length ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Unread Notifications</p>
          <p className="text-2xl font-semibold">{unreadNotifications}</p>
        </Card>
      </div>

      <Card className="space-y-2">
        <h2 className="text-lg font-medium">Latest Case Status Snapshot</h2>
        {!cases?.length ? (
          <p className="text-sm text-slate-600">No cases tracked yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {cases.slice(0, 5).map((item) => (
              <li key={item.id}>
                {item.id.slice(0, 8)} • {item.status} •{' '}
                {item.nextHearing ? new Date(item.nextHearing).toLocaleString() : 'No hearing date'}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
