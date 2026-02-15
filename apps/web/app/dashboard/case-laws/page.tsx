'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

const searchSchema = z.object({
  q: z.string().min(2, 'Enter at least 2 characters'),
  court: z.string().optional(),
  yearFrom: z.string().optional(),
  yearTo: z.string().optional(),
  limit: z.string().optional(),
});

type SearchInput = z.infer<typeof searchSchema>;

type CaseLawSearchResult = {
  id: string;
  title: string;
  court: string;
  judgmentDate: string;
  summary: string;
  fullText: string;
};

export default function CaseLawsSearchPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchInput>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      q: '',
      court: '',
      yearFrom: '',
      yearTo: '',
      limit: '20',
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (values: SearchInput) => {
      const params = {
        q: values.q,
        court: values.court || undefined,
        yearFrom: values.yearFrom ? Number(values.yearFrom) : undefined,
        yearTo: values.yearTo ? Number(values.yearTo) : undefined,
        limit: values.limit ? Number(values.limit) : undefined,
      };
      const response = await api.get<CaseLawSearchResult[]>('/case-laws/search', { params });
      return response.data;
    },
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Semantic Case Law Search</h1>
      <Card className="space-y-4">
        <form className="space-y-3" onSubmit={handleSubmit((values) => searchMutation.mutate(values))}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Search Query</label>
            <Input
              placeholder="Example: anticipatory bail in economic offences"
              {...register('q')}
            />
            {errors.q ? <p className="text-xs text-rose-600">{errors.q.message}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Court (optional)</label>
              <Input placeholder="Supreme Court of India" {...register('court')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Year From</label>
              <Input placeholder="2018" {...register('yearFrom')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Year To</label>
              <Input placeholder="2026" {...register('yearTo')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Limit</label>
              <Input placeholder="20" {...register('limit')} />
            </div>
          </div>

          <Button className="w-full" disabled={searchMutation.isPending} type="submit">
            {searchMutation.isPending ? 'Searching...' : 'Search Case Laws'}
          </Button>
        </form>
      </Card>

      {searchMutation.isError ? (
        <p className="text-sm text-rose-600">Search failed. Please try again.</p>
      ) : null}

      <div className="space-y-3">
        {searchMutation.isSuccess && searchMutation.data.length === 0 ? (
          <Card>No matching case laws found.</Card>
        ) : null}

        {searchMutation.data?.map((item) => (
          <Card className="space-y-2" key={item.id}>
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-slate-600">
              {item.court} • {new Date(item.judgmentDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-slate-700">{item.summary}</p>
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-700">View full text</summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                {item.fullText}
              </pre>
            </details>
          </Card>
        ))}
      </div>
    </section>
  );
}
