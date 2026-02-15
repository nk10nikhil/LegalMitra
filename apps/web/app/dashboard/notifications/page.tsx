'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@legalmitra/ui';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type NotificationItem = {
  id: string;
  type: string;
  content: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

type ReminderItem = {
  hearingId: string;
  caseId: string;
  caseNumber: string | null;
  courtCode: string | null;
  scheduledAt: string;
  roomUrl: string;
  status: string;
};

function formatContent(content: Record<string, unknown>) {
  const entries = Object.entries(content ?? {});
  if (!entries.length) return 'No additional details';
  return entries
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' • ');
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<NotificationItem[]>('/notifications')).data,
  });

  const { data: reminders } = useQuery({
    queryKey: ['hearing-reminders'],
    queryFn: async () => (await api.get<ReminderItem[]>('/notifications/reminders?days=7')).data,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/notifications/${id}/read`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error('Unable to mark notification as read.');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => (await api.post('/notifications/read-all')).data,
    onSuccess: async (result: { updatedCount: number }) => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`${result.updatedCount} notifications marked as read`);
    },
    onError: () => {
      toast.error('Unable to mark all notifications as read.');
    },
  });

  const unreadCount = data?.filter((item) => !item.read).length ?? 0;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Button
          disabled={markAllReadMutation.isPending || unreadCount === 0}
          onClick={() => markAllReadMutation.mutate()}
          type="button"
          variant="outline"
        >
          Mark All Read
        </Button>
      </div>

      <Card className="text-sm text-slate-600">Unread: {unreadCount}</Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-medium">Upcoming Hearing Reminders (7 days)</h2>
        {!reminders?.length ? (
          <p className="text-sm text-slate-600">No upcoming hearings in this window.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {reminders.map((item) => (
              <li key={item.hearingId}>
                {item.caseNumber ?? item.caseId} ({item.courtCode ?? 'N/A'}) •{' '}
                {new Date(item.scheduledAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isLoading ? <p className="text-sm text-slate-500">Loading notifications...</p> : null}
      {!isLoading && !data?.length ? <Card>No notifications yet.</Card> : null}

      <div className="grid gap-3">
        {data?.map((item) => (
          <Card className="space-y-2" key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{item.type}</p>
              <span
                className={`rounded px-2 py-0.5 text-xs ${
                  item.read ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {item.read ? 'Read' : 'Unread'}
              </span>
            </div>
            <p className="text-sm text-slate-700">{formatContent(item.content ?? {})}</p>
            <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
            {!item.read ? (
              <Button
                disabled={markReadMutation.isPending}
                onClick={() => markReadMutation.mutate(item.id)}
                type="button"
                variant="outline"
              >
                Mark Read
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
