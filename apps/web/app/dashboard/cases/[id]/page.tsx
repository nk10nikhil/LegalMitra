'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Card } from '@legalmitra/ui';
import { api } from '@/lib/api';

type CaseDetail = {
  id: string;
  caseNumber: string;
  courtCode: string;
  status: string;
  nextHearing: string | null;
  lastSynced: string;
  createdAt: string;
  caseData: Record<string, unknown>;
};

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['case', params.id],
    queryFn: async () => (await api.get<CaseDetail>(`/cases/${params.id}`)).data,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => (await api.post(`/cases/${params.id}/refresh`)).data,
    onSuccess: async () => {
      toast.success('Case refreshed');
      await queryClient.invalidateQueries({ queryKey: ['case', params.id] });
      await queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: () => {
      toast.error('Refresh failed. Please try again.');
    },
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading case details...</p>;
  if (isError || !data) return <p className="text-sm text-rose-600">Could not load this case.</p>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{data.caseNumber}</h1>
        <Button
          disabled={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
          variant="outline"
        >
          {refreshMutation.isPending ? 'Refreshing...' : 'Refresh from eCourts'}
        </Button>
      </div>
      <Card className="space-y-2 text-sm">
        <p>
          <strong>Court:</strong> {data.courtCode}
        </p>
        <p>
          <strong>Status:</strong> {data.status}
        </p>
        <p>
          <strong>Next Hearing:</strong>{' '}
          {data.nextHearing ? new Date(data.nextHearing).toLocaleString() : 'N/A'}
        </p>
        <p>
          <strong>Last Synced:</strong> {new Date(data.lastSynced).toLocaleString()}
        </p>
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-medium">Raw eCourts Data</h2>
        <pre className="max-h-[420px] overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(data.caseData, null, 2)}
        </pre>
      </Card>
    </section>
  );
}
