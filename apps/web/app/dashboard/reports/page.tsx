'use client';

import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@legalmitra/ui';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type ReportResponse = {
  generatedAt: string;
  role: string;
  totals: {
    cases: number;
    documents: number;
    notifications: number;
    unreadNotifications: number;
    hearings: number;
    lawyerNotes: number;
  };
  cases: Array<{
    id: string;
    caseNumber: string;
    courtCode: string;
    status: string;
    createdAt: string;
  }>;
  documents: Array<{ id: string; type: string; title: string; createdAt: string }>;
  notifications: Array<{ id: string; type: string; read: boolean; createdAt: string }>;
  hearings: Array<{ id: string; caseId: string; status: string; scheduledAt: string }>;
  notes: Array<{ id: string; caseId: string; createdAt: string }>;
};

export default function ReportsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-report'],
    queryFn: async () => (await api.get<ReportResponse>('/reports/me')).data,
  });

  const download = () => {
    if (!data) {
      toast.error('No report data to download.');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `legalmitra-report-${new Date(data.generatedAt).toISOString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">My Reports</h1>
        <Button onClick={download} type="button" variant="outline">
          Download JSON
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-slate-500">Generating report...</p> : null}
      {isError ? <Card>Unable to generate report.</Card> : null}

      {data ? (
        <>
          <Card className="space-y-1">
            <p className="text-sm text-slate-600">Generated</p>
            <p className="font-medium">{new Date(data.generatedAt).toLocaleString()}</p>
            <p className="text-sm text-slate-600">Role: {data.role}</p>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
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
              <p className="text-sm text-slate-600">Notifications</p>
              <p className="text-2xl font-semibold">
                {data.totals.notifications} ({data.totals.unreadNotifications} unread)
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600">Lawyer Notes</p>
              <p className="text-2xl font-semibold">{data.totals.lawyerNotes}</p>
            </Card>
          </div>
        </>
      ) : null}
    </section>
  );
}
