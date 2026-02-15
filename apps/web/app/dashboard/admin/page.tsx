'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Card } from '@legalmitra/ui';
import { api } from '@/lib/api';

type AdminMetrics = {
  totals: {
    users: number;
    cases: number;
    documents: number;
    hearings: number;
    notifications: number;
    unreadNotifications: number;
    auditLogs: number;
  };
  roleBreakdown: Array<{ role: string; count: number }>;
  recentAudit: Array<{ id: string; action: string; resource: string; createdAt: string }>;
};

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => (await api.get<AdminMetrics>('/admin/metrics')).data,
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Link href="/dashboard/admin/users">
          <Button type="button" variant="outline">
            Manage Users
          </Button>
        </Link>
      </div>

      {isLoading ? <p className="text-sm text-slate-500">Loading admin metrics...</p> : null}
      {isError ? (
        <Card>
          <p className="text-sm text-rose-700">
            Unable to load admin metrics. Ensure your profile role is set to admin.
          </p>
        </Card>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <p className="text-sm text-slate-600">Users</p>
              <p className="text-2xl font-semibold">{data.totals.users}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600">Cases</p>
              <p className="text-2xl font-semibold">{data.totals.cases}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600">Documents</p>
              <p className="text-2xl font-semibold">{data.totals.documents}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600">Hearings</p>
              <p className="text-2xl font-semibold">{data.totals.hearings}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600">Notifications (Unread)</p>
              <p className="text-2xl font-semibold">
                {data.totals.notifications} ({data.totals.unreadNotifications})
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600">Audit Logs</p>
              <p className="text-2xl font-semibold">{data.totals.auditLogs}</p>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card className="space-y-2">
              <h2 className="text-lg font-medium">Role Breakdown</h2>
              {!data.roleBreakdown.length ? (
                <p className="text-sm text-slate-500">No role data available.</p>
              ) : (
                <ul className="space-y-1 text-sm text-slate-700">
                  {data.roleBreakdown.map((item) => (
                    <li key={item.role}>
                      {item.role}: {item.count}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-2">
              <h2 className="text-lg font-medium">Recent Audit Events</h2>
              {!data.recentAudit.length ? (
                <p className="text-sm text-slate-500">No audit events yet.</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-700">
                  {data.recentAudit.map((item) => (
                    <li key={item.id}>
                      <p className="font-medium">{item.action}</p>
                      <p>Resource: {item.resource}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </section>
  );
}
