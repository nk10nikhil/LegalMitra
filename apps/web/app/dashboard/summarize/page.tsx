'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

type SummarizeResponse = {
  summary: string;
  charCount: number;
  model: string;
  saved: boolean;
  document: {
    id: string;
    title: string;
    type: string;
    createdAt: string;
  } | null;
};

export default function SummarizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [saveResult, setSaveResult] = useState(true);

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please select a PDF file');

      const formData = new FormData();
      formData.append('file', file);
      if (title.trim()) {
        formData.append('title', title.trim());
      }
      formData.append('saveResult', String(saveResult));

      const response = await api.post<SummarizeResponse>('/documents/summarize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Judgment Summarization</h1>

      <Card className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Judgment PDF</label>
          <Input
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Summary Title (optional)</label>
          <Input
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Judgment Summary - ABC vs XYZ"
            value={title}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            checked={saveResult}
            onChange={(event) => setSaveResult(event.target.checked)}
            type="checkbox"
          />
          Save summary to My Documents
        </label>

        <Button
          className="w-full"
          disabled={summarizeMutation.isPending || !file}
          onClick={() => summarizeMutation.mutate()}
          type="button"
        >
          {summarizeMutation.isPending ? 'Summarizing...' : 'Upload and Summarize'}
        </Button>

        {summarizeMutation.isError ? (
          <p className="text-sm text-rose-600">Unable to summarize file. Please try another PDF.</p>
        ) : null}
      </Card>

      {summarizeMutation.data ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="text-sm text-slate-600">
            Model: {summarizeMutation.data.model} • Source length: {summarizeMutation.data.charCount}{' '}
            characters
          </p>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{summarizeMutation.data.summary}</p>

          {summarizeMutation.data.saved && summarizeMutation.data.document ? (
            <p className="text-sm text-emerald-700">
              Saved to My Documents as: {summarizeMutation.data.document.title}
            </p>
          ) : (
            <p className="text-sm text-slate-600">Summary generated without saving.</p>
          )}
        </Card>
      ) : null}
    </section>
  );
}
