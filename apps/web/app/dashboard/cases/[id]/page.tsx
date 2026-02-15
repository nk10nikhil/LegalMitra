'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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

type Profile = {
  role: 'citizen' | 'lawyer' | 'judge' | 'admin';
};

type PredictionResponse = {
  success_probability: number;
  similar_cases: number;
  model: string;
  disclaimer: string;
};

type CaseNote = {
  id: string;
  caseId: string;
  lawyerId: string;
  note: string;
  createdAt: string;
};

type CaseTimelineEvent = {
  id: string;
  type: string;
  title: string;
  description: string;
  occurredAt: string;
};

const noteSchema = z.object({
  note: z.string().min(2, 'Note is required').max(5000, 'Note is too long'),
});

type NoteInput = z.infer<typeof noteSchema>;

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [timelineType, setTimelineType] = useState<'all' | CaseTimelineEvent['type']>('all');
  const [timelineFrom, setTimelineFrom] = useState('');
  const [timelineTo, setTimelineTo] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['case', params.id],
    queryFn: async () => (await api.get<CaseDetail>(`/cases/${params.id}`)).data,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile-role-case-detail'],
    queryFn: async () => (await api.get<Profile>('/profiles/me')).data,
  });

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['case-notes', params.id],
    queryFn: async () => (await api.get<CaseNote[]>(`/cases/${params.id}/notes`)).data,
  });

  const timelineQuery = useMemo(() => {
    const search = new URLSearchParams();
    if (timelineType !== 'all') search.set('type', timelineType);
    if (timelineFrom) search.set('from', new Date(timelineFrom).toISOString());
    if (timelineTo) search.set('to', new Date(timelineTo).toISOString());
    return search.toString();
  }, [timelineFrom, timelineTo, timelineType]);

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['case-timeline', params.id, timelineQuery],
    queryFn: async () =>
      (
        await api.get<CaseTimelineEvent[]>(
          `/cases/${params.id}/timeline${timelineQuery ? `?${timelineQuery}` : ''}`,
        )
      ).data,
  });

  const downloadTimelineJson = () => {
    if (!timeline?.length) {
      toast.error('No timeline events to export.');
      return;
    }

    const blob = new Blob([JSON.stringify(timeline, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `case-${params.id}-timeline.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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

  const predictionMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('Case data not loaded');

      const parsedDate = data.nextHearing ? new Date(data.nextHearing) : new Date();
      const payload = {
        court: data.courtCode,
        year: Number.isNaN(parsedDate.getFullYear())
          ? new Date().getFullYear()
          : parsedDate.getFullYear(),
        petitioner_type: 'individual',
        respondent_type: 'state',
        acts_cited_count: 3,
        prior_hearings: 2,
      };

      return (await api.post<PredictionResponse>('/ai/predict', payload)).data;
    },
    onError: () => {
      toast.error('Prediction failed. Please try again.');
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (payload: NoteInput) =>
      (await api.post<CaseNote>(`/cases/${params.id}/notes`, payload)).data,
    onSuccess: async () => {
      toast.success('Note added');
      reset({ note: '' });
      await queryClient.invalidateQueries({ queryKey: ['case-notes', params.id] });
    },
    onError: () => {
      toast.error('Unable to add note.');
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

      {profile?.role === 'lawyer' ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">Case Outcome Prediction</h2>
            <Button
              disabled={predictionMutation.isPending}
              onClick={() => predictionMutation.mutate()}
              variant="outline"
            >
              {predictionMutation.isPending ? 'Predicting...' : 'Generate Prediction'}
            </Button>
          </div>

          {predictionMutation.data ? (
            <p className="text-sm text-slate-700">
              Based on {predictionMutation.data.similar_cases.toLocaleString()} similar cases,
              success probability is {Math.round(predictionMutation.data.success_probability * 100)}
              %.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Run prediction to estimate outcome probability.
            </p>
          )}

          <p className="text-xs text-amber-700">
            {predictionMutation.data?.disclaimer ??
              'For research and educational use only. Not legal advice or a guaranteed outcome.'}
          </p>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-lg font-medium">Case Notes</h2>

        {profile?.role === 'lawyer' ? (
          <form
            className="space-y-2"
            onSubmit={handleSubmit((values) => addNoteMutation.mutate(values))}
          >
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Add lawyer note"
              {...register('note')}
            />
            {errors.note ? <p className="text-xs text-rose-600">{errors.note.message}</p> : null}
            <Button disabled={addNoteMutation.isPending} type="submit" variant="outline">
              {addNoteMutation.isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </form>
        ) : null}

        {notesLoading ? <p className="text-sm text-slate-500">Loading notes...</p> : null}
        {!notesLoading && !notes?.length ? (
          <p className="text-sm text-slate-600">No notes available.</p>
        ) : null}
        <div className="space-y-2">
          {notes?.map((item) => (
            <div className="rounded border border-slate-200 p-3" key={item.id}>
              <p className="text-sm text-slate-800">{item.note}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(item.createdAt).toLocaleString()} • Lawyer: {item.lawyerId}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Case Timeline</h2>
          <Button onClick={downloadTimelineJson} type="button" variant="outline">
            Download JSON
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Type</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              onChange={(event) =>
                setTimelineType(event.target.value as 'all' | CaseTimelineEvent['type'])
              }
              value={timelineType}
            >
              <option value="all">All</option>
              <option value="case_created">Case Created</option>
              <option value="hearing">Hearing</option>
              <option value="note">Note</option>
              <option value="document">Document</option>
              <option value="audit">Audit</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">From</label>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              onChange={(event) => setTimelineFrom(event.target.value)}
              type="datetime-local"
              value={timelineFrom}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">To</label>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              onChange={(event) => setTimelineTo(event.target.value)}
              type="datetime-local"
              value={timelineTo}
            />
          </div>
        </div>

        {timelineLoading ? <p className="text-sm text-slate-500">Loading timeline...</p> : null}
        {!timelineLoading && !timeline?.length ? (
          <p className="text-sm text-slate-600">No timeline events yet.</p>
        ) : null}
        <div className="space-y-2">
          {timeline?.map((event) => (
            <div className="rounded border border-slate-200 p-3" key={event.id}>
              <p className="text-sm font-medium text-slate-800">{event.title}</p>
              <p className="text-sm text-slate-700">{event.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(event.occurredAt).toLocaleString()} • {event.type}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
