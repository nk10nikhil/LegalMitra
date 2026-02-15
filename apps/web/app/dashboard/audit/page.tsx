'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

type AuditLogItem = {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

function metadataPreview(metadata: Record<string, unknown> | null) {
  if (!metadata || !Object.keys(metadata).length) return 'No metadata';
  const entries = Object.entries(metadata).slice(0, 4);
  return entries
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' • ');
}

export default function AuditTrailPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (actionFilter.trim()) params.set('action', actionFilter.trim());
    if (resourceFilter.trim()) params.set('resource', resourceFilter.trim());
    params.set('sort', sort);
    params.set('limit', '100');
    return params.toString();
  }, [actionFilter, resourceFilter, sort]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: async () => (await api.get<AuditLogItem[]>(`/audit-logs?${queryParams}`)).data,
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Audit Trail</h1>

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Action Filter</label>
            <Input
              onChange={(event) => setActionFilter(event.target.value)}
              placeholder="e.g. case.track"
              value={actionFilter}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Resource Filter</label>
            <Input
              onChange={(event) => setResourceFilter(event.target.value)}
              placeholder="e.g. cases"
              value={resourceFilter}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Sort</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              onChange={(event) => setSort(event.target.value as 'asc' | 'desc')}
              value={sort}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
        <Button disabled={isFetching} onClick={() => refetch()} type="button" variant="outline">
          {isFetching ? 'Refreshing...' : 'Apply Filters'}
        </Button>
      </Card>

      {isLoading ? <p className="text-sm text-slate-500">Loading audit logs...</p> : null}
      {!isLoading && !data?.length ? <Card>No audit entries found.</Card> : null}

      <div className="grid gap-3">
        {data?.map((item) => (
          <Card className="space-y-1" key={item.id}>
            <p className="font-medium">{item.action}</p>
            <p className="text-sm text-slate-700">Resource: {item.resource}</p>
            <p className="text-sm text-slate-700">{metadataPreview(item.metadata)}</p>
            <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
