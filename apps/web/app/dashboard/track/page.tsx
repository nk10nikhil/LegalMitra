'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

const trackCaseSchema = z.object({
  caseNumber: z.string().min(3, 'Case number is required'),
  courtCode: z.string().min(2, 'Court code is required'),
});

type TrackCaseInput = z.infer<typeof trackCaseSchema>;

type TrackResponse = {
  id: string;
};

export default function TrackCasePage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackCaseInput>({
    resolver: zodResolver(trackCaseSchema),
  });

  const mutation = useMutation({
    mutationFn: async (payload: TrackCaseInput) =>
      (await api.post<TrackResponse>('/cases/track', payload)).data,
    onSuccess: (data) => {
      toast.success('Case tracked successfully');
      router.push(`/dashboard/cases/${data.id}`);
    },
    onError: () => {
      toast.error('Unable to track case right now. Please verify details and try again.');
    },
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Track a New Case</h1>
      <Card className="max-w-xl">
        <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Case Number</label>
            <Input placeholder="ABC/1234/2024" {...register('caseNumber')} />
            {errors.caseNumber ? (
              <p className="text-xs text-rose-600">{errors.caseNumber.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Court Code</label>
            <Input placeholder="DLHC01" {...register('courtCode')} />
            {errors.courtCode ? (
              <p className="text-xs text-rose-600">{errors.courtCode.message}</p>
            ) : null}
          </div>
          <Button className="w-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Fetching from eCourts...' : 'Track Case'}
          </Button>
        </form>
      </Card>
    </section>
  );
}
