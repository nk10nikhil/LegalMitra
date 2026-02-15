'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Input } from '@legalmitra/ui';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type DigiLockerRequest = {
  id: string;
  caseId: string | null;
  status: string;
  jobId: string | null;
  errorMessage: string | null;
  resultPayload: { recordsImported?: number; source?: string } | null;
  createdAt: string;
  completedAt: string | null;
};

export default function IntegrationsPage() {
  const [caseIdInput, setCaseIdInput] = useState('');
  const [caseIdFilter, setCaseIdFilter] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['digilocker-requests', caseIdFilter],
    queryFn: async () => {
      const url = caseIdFilter
        ? `/integrations/digilocker/requests?caseId=${encodeURIComponent(caseIdFilter)}`
        : '/integrations/digilocker/requests';
      return (await api.get<DigiLockerRequest[]>(url)).data;
    },
    refetchInterval: 5000,
  });

  const trigger = useMutation({
    mutationFn: async (caseId: string) =>
      (await api.post<{ requestId: string }>(`/integrations/digilocker/fetch/${caseId}`)).data,
    onSuccess: () => {
      toast.success('DigiLocker fetch queued');
      void refetch();
    },
    onError: () => {
      toast.error('Failed to queue DigiLocker fetch. Check the case id and try again.');
    },
  });

  const {
    data: firData,
    isLoading: isFirLoading,
    isFetching: isFirFetching,
    refetch: refetchFir,
  } = useQuery({
    queryKey: ['fir-requests', caseIdFilter],
    queryFn: async () => {
      const url = caseIdFilter
        ? `/integrations/fir/requests?caseId=${encodeURIComponent(caseIdFilter)}`
        : '/integrations/fir/requests';
      return (await api.get<DigiLockerRequest[]>(url)).data;
    },
    refetchInterval: 5000,
  });

  const triggerFir = useMutation({
    mutationFn: async (caseId: string) =>
      (await api.post<{ requestId: string }>(`/integrations/fir/fetch/${caseId}`)).data,
    onSuccess: () => {
      toast.success('FIR fetch queued');
      void refetchFir();
    },
    onError: () => {
      toast.error('Failed to queue FIR fetch. Check the case id and try again.');
    },
  });

  const {
    data: landRecordsData,
    isLoading: isLandRecordsLoading,
    isFetching: isLandRecordsFetching,
    refetch: refetchLandRecords,
  } = useQuery({
    queryKey: ['land-records-requests', caseIdFilter],
    queryFn: async () => {
      const url = caseIdFilter
        ? `/integrations/land-records/requests?caseId=${encodeURIComponent(caseIdFilter)}`
        : '/integrations/land-records/requests';
      return (await api.get<DigiLockerRequest[]>(url)).data;
    },
    refetchInterval: 5000,
  });

  const triggerLandRecords = useMutation({
    mutationFn: async (caseId: string) =>
      (await api.post<{ requestId: string }>(`/integrations/land-records/fetch/${caseId}`)).data,
    onSuccess: () => {
      toast.success('Land records fetch queued');
      void refetchLandRecords();
    },
    onError: () => {
      toast.error('Failed to queue land records fetch. Check the case id and try again.');
    },
  });

  function submitTrigger() {
    const value = caseIdInput.trim();
    if (!value) {
      toast.error('Case id is required');
      return;
    }

    trigger.mutate(value);
  }

  function submitFirTrigger() {
    const value = caseIdInput.trim();
    if (!value) {
      toast.error('Case id is required');
      return;
    }

    triggerFir.mutate(value);
  }

  function submitLandRecordsTrigger() {
    const value = caseIdInput.trim();
    if (!value) {
      toast.error('Case id is required');
      return;
    }

    triggerLandRecords.mutate(value);
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Government Integrations</h1>
      <Card className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Trigger DigiLocker connector fetch for a case and monitor request status.
        </p>
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            onChange={(event) => setCaseIdInput(event.target.value)}
            placeholder="Case id"
            value={caseIdInput}
          />
          <Button disabled={trigger.isPending} onClick={submitTrigger}>
            {trigger.isPending ? 'Queueing...' : 'Fetch from DigiLocker'}
          </Button>
          <Button disabled={triggerFir.isPending} onClick={submitFirTrigger} variant="outline">
            {triggerFir.isPending ? 'Queueing...' : 'Fetch from FIR Portal'}
          </Button>
          <Button
            disabled={triggerLandRecords.isPending}
            onClick={submitLandRecordsTrigger}
            variant="outline"
          >
            {triggerLandRecords.isPending ? 'Queueing...' : 'Fetch from Land Records'}
          </Button>
          <Button
            onClick={() => {
              setCaseIdFilter(caseIdInput.trim() || null);
            }}
            type="button"
            variant="outline"
          >
            Filter list
          </Button>
          <Button
            onClick={() => {
              setCaseIdInput('');
              setCaseIdFilter(null);
            }}
            type="button"
            variant="outline"
          >
            Clear filter
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent DigiLocker Requests</h2>
          <Button disabled={isFetching} onClick={() => void refetch()} variant="outline">
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {isLoading ? <p className="text-sm text-slate-500">Loading requests...</p> : null}
        {!isLoading && !data?.length ? (
          <p className="text-sm text-slate-500">No connector requests found.</p>
        ) : null}

        <div className="space-y-2">
          {data?.map((item) => (
            <div className="rounded border p-3 text-sm" key={item.id}>
              <p>
                <span className="font-medium">Request:</span> {item.id}
              </p>
              <p>
                <span className="font-medium">Case:</span> {item.caseId ?? 'N/A'}
              </p>
              <p>
                <span className="font-medium">Status:</span> {item.status}
              </p>
              <p>
                <span className="font-medium">Job:</span> {item.jobId ?? 'N/A'}
              </p>
              <p>
                <span className="font-medium">Created:</span>{' '}
                {new Date(item.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Completed:</span>{' '}
                {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'Pending'}
              </p>
              <p>
                <span className="font-medium">Imported:</span>{' '}
                {item.resultPayload?.recordsImported ?? 0}
              </p>
              <p>
                <span className="font-medium">Source:</span> {item.resultPayload?.source ?? 'N/A'}
              </p>
              {item.errorMessage ? (
                <p className="text-rose-600">
                  <span className="font-medium">Error:</span> {item.errorMessage}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent FIR Requests</h2>
          <Button disabled={isFirFetching} onClick={() => void refetchFir()} variant="outline">
            {isFirFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {isFirLoading ? <p className="text-sm text-slate-500">Loading requests...</p> : null}
        {!isFirLoading && !firData?.length ? (
          <p className="text-sm text-slate-500">No connector requests found.</p>
        ) : null}

        <div className="space-y-2">
          {firData?.map((item) => (
            <div className="rounded border p-3 text-sm" key={item.id}>
              <p>
                <span className="font-medium">Request:</span> {item.id}
              </p>
              <p>
                <span className="font-medium">Case:</span> {item.caseId ?? 'N/A'}
              </p>
              <p>
                <span className="font-medium">Status:</span> {item.status}
              </p>
              <p>
                <span className="font-medium">Job:</span> {item.jobId ?? 'N/A'}
              </p>
              <p>
                <span className="font-medium">Created:</span>{' '}
                {new Date(item.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Completed:</span>{' '}
                {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'Pending'}
              </p>
              <p>
                <span className="font-medium">Imported:</span>{' '}
                {item.resultPayload?.recordsImported ?? 0}
              </p>
              <p>
                <span className="font-medium">Source:</span> {item.resultPayload?.source ?? 'N/A'}
              </p>
              {item.errorMessage ? (
                <p className="text-rose-600">
                  <span className="font-medium">Error:</span> {item.errorMessage}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent Land Record Requests</h2>
          <Button
            disabled={isLandRecordsFetching}
            onClick={() => void refetchLandRecords()}
            variant="outline"
          >
            {isLandRecordsFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {isLandRecordsLoading ? (
          <p className="text-sm text-slate-500">Loading requests...</p>
        ) : null}
        {!isLandRecordsLoading && !landRecordsData?.length ? (
          <p className="text-sm text-slate-500">No connector requests found.</p>
        ) : null}

        <div className="space-y-2">
          {landRecordsData?.map((item) => (
            <div className="rounded border p-3 text-sm" key={item.id}>
              <p>
                <span className="font-medium">Request:</span> {item.id}
              </p>
              <p>
                <span className="font-medium">Case:</span> {item.caseId ?? 'N/A'}
              </p>
              <p>
                <span className="font-medium">Status:</span> {item.status}
              </p>
              <p>
                <span className="font-medium">Job:</span> {item.jobId ?? 'N/A'}
              </p>
              <p>
                <span className="font-medium">Created:</span>{' '}
                {new Date(item.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Completed:</span>{' '}
                {item.completedAt ? new Date(item.completedAt).toLocaleString() : 'Pending'}
              </p>
              <p>
                <span className="font-medium">Imported:</span>{' '}
                {item.resultPayload?.recordsImported ?? 0}
              </p>
              <p>
                <span className="font-medium">Source:</span> {item.resultPayload?.source ?? 'N/A'}
              </p>
              {item.errorMessage ? (
                <p className="text-rose-600">
                  <span className="font-medium">Error:</span> {item.errorMessage}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
