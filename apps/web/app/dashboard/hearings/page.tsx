'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

type CaseItem = {
  id: string;
  caseNumber: string;
  courtCode: string;
};

type HearingItem = {
  id: string;
  caseId: string;
  caseNumber: string | null;
  courtCode: string | null;
  scheduledAt: string;
  roomUrl: string;
  status: 'scheduled' | 'completed' | 'cancelled' | string;
  recordingUrl?: string | null;
};

const formSchema = z.object({
  caseId: z.string().uuid('Select a valid case'),
  scheduledAt: z.string().min(1, 'Select date and time'),
  roomLabel: z.string().max(100).optional(),
});

type FormInput = z.infer<typeof formSchema>;

export default function HearingsPage() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
  });

  const { data: cases, isLoading: isCasesLoading } = useQuery({
    queryKey: ['cases-for-hearings'],
    queryFn: async () => (await api.get<CaseItem[]>('/cases')).data,
  });

  const { data: hearings, isLoading: isHearingsLoading } = useQuery({
    queryKey: ['hearings'],
    queryFn: async () => (await api.get<HearingItem[]>('/hearings')).data,
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormInput) =>
      (
        await api.post<HearingItem>('/hearings', {
          caseId: values.caseId,
          scheduledAt: new Date(values.scheduledAt).toISOString(),
          roomLabel: values.roomLabel || undefined,
        })
      ).data,
    onSuccess: async () => {
      toast.success('Hearing scheduled');
      reset({ caseId: '', scheduledAt: '', roomLabel: '' });
      await queryClient.invalidateQueries({ queryKey: ['hearings'] });
    },
    onError: () => {
      toast.error('Unable to schedule hearing.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'completed' | 'cancelled' }) =>
      (await api.post(`/hearings/${id}/status`, { status })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hearings'] });
    },
    onError: () => {
      toast.error('Unable to update hearing status.');
    },
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Virtual Hearings</h1>

      <Card className="space-y-4">
        <h2 className="text-lg font-medium">Schedule Hearing</h2>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((v) => createMutation.mutate(v))}>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Case</label>
            <select
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              defaultValue=""
              {...register('caseId')}
            >
              <option disabled value="">
                Select case
              </option>
              {cases?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.caseNumber} ({item.courtCode})
                </option>
              ))}
            </select>
            {errors.caseId ? <p className="text-xs text-rose-600">{errors.caseId.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Scheduled At</label>
            <Input type="datetime-local" {...register('scheduledAt')} />
            {errors.scheduledAt ? (
              <p className="text-xs text-rose-600">{errors.scheduledAt.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Room Label (optional)</label>
            <Input placeholder="civil-matter-room-12" {...register('roomLabel')} />
          </div>

          <div className="md:col-span-2">
            <Button className="w-full" disabled={createMutation.isPending || isCasesLoading} type="submit">
              {createMutation.isPending ? 'Scheduling...' : 'Schedule Hearing'}
            </Button>
          </div>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">My Hearings</h2>
        {isHearingsLoading ? <p className="text-sm text-slate-500">Loading hearings...</p> : null}
        {!isHearingsLoading && !hearings?.length ? <Card>No hearings scheduled yet.</Card> : null}

        <div className="grid gap-3">
          {hearings?.map((item) => (
            <Card className="space-y-3" key={item.id}>
              <div className="space-y-1">
                <p className="font-medium">
                  {item.caseNumber ?? item.caseId} {item.courtCode ? `(${item.courtCode})` : ''}
                </p>
                <p className="text-sm text-slate-600">
                  Scheduled: {new Date(item.scheduledAt).toLocaleString()}
                </p>
                <p className="text-sm text-slate-600">Status: {item.status}</p>
                <a className="text-sm text-blue-700 underline" href={item.roomUrl} rel="noreferrer" target="_blank">
                  Join Hearing Room
                </a>
              </div>

              {item.status === 'scheduled' ? (
                <div className="flex gap-2">
                  <Button
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: item.id, status: 'completed' })}
                    type="button"
                    variant="outline"
                  >
                    Mark Completed
                  </Button>
                  <Button
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: item.id, status: 'cancelled' })}
                    type="button"
                    variant="outline"
                  >
                    Cancel Hearing
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}
