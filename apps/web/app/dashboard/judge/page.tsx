'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@legalmitra/ui';
import { api } from '@/lib/api';

type HearingItem = { id: string; status: string; scheduledAt: string };
type NotificationItem = { id: string; read: boolean };

export default function JudgeDashboardPage() {
  const { data: hearings } = useQuery({
    queryKey: ['judge-hearings-overview'],
    queryFn: async () => (await api.get<HearingItem[]>('/hearings')).data,
  });

  const { data: notifications } = useQuery({
    queryKey: ['judge-notifications-overview'],
    queryFn: async () => (await api.get<NotificationItem[]>('/notifications')).data,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Judge Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-600">Scheduled Hearings</p>
          <p className="text-2xl font-semibold">
            {hearings?.filter((item) => item.status === 'scheduled').length ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Completed Hearings</p>
          <p className="text-2xl font-semibold">
            {hearings?.filter((item) => item.status === 'completed').length ?? 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Unread Notifications</p>
          <p className="text-2xl font-semibold">
            {notifications?.filter((item) => !item.read).length ?? 0}
          </p>
        </Card>
      </div>

      <Card className="space-y-2">
        <h2 className="text-lg font-medium">Next Hearing Windows</h2>
        {!hearings?.length ? (
          <p className="text-sm text-slate-600">No hearing data available.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {hearings
              .filter((item) => item.status === 'scheduled')
              .slice(0, 5)
              .map((item) => (
                <li key={item.id}>{new Date(item.scheduledAt).toLocaleString()}</li>
              ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
