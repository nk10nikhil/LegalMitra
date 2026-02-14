'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

type AskResponse = {
  answer: string;
  confidence: number;
  language: string;
  source_id?: string | null;
  disclaimer: string;
};

type ChatMessage =
  | { role: 'user'; text: string }
  | {
      role: 'assistant';
      text: string;
      confidence: number;
      disclaimer: string;
      sourceId?: string | null;
    };

type HistoryItem = {
  role: 'user' | 'assistant';
  text: string;
  confidence?: number;
  sourceId?: string | null;
  disclaimer?: string;
  createdAt: string;
};

type HistoryResponse = {
  messages: HistoryItem[];
};

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const { data: history } = useQuery<HistoryResponse>({
    queryKey: ['ai-history'],
    queryFn: async () => (await api.get<HistoryResponse>('/ai/history')).data,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!history || messages.length > 0) return;

    const mapped = history.messages.map<ChatMessage>((item) =>
      item.role === 'user'
        ? { role: 'user', text: item.text }
        : {
            role: 'assistant',
            text: item.text,
            confidence: item.confidence ?? 0,
            disclaimer: item.disclaimer ?? 'AI output is informational and not legal advice.',
            sourceId: item.sourceId,
          },
    );
    setMessages(mapped);
  }, [history, messages.length]);

  const askMutation = useMutation({
    mutationFn: async (payload: { question: string; language: 'en' | 'hi' }) => {
      const response = await api.post<AskResponse>('/ai/ask', payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: variables.question },
        {
          role: 'assistant',
          text: data.answer,
          confidence: data.confidence,
          disclaimer: data.disclaimer,
          sourceId: data.source_id,
        },
      ]);
      setQuestion('');
    },
  });

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    askMutation.mutate({ question: trimmed, language });
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Ask Legal AI</h1>
      <Card className="space-y-3">
        <p className="text-sm text-slate-600">
          Ask legal questions in English or Hindi. AI responses are informational and not legal
          advice.
        </p>

        <form className="space-y-3" onSubmit={submitQuestion}>
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400"
            onChange={(event) => setLanguage(event.target.value as 'en' | 'hi')}
            value={language}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>

          <Input
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={
              language === 'hi' ? 'अपना कानूनी प्रश्न लिखें...' : 'Type your legal question...'
            }
            value={question}
          />

          <Button className="w-full" disabled={askMutation.isPending} type="submit">
            {askMutation.isPending ? 'Generating answer...' : 'Ask'}
          </Button>
        </form>

        {askMutation.error ? (
          <p className="text-sm text-rose-600">Unable to fetch AI response. Try again.</p>
        ) : null}
      </Card>

      <div className="space-y-3">
        {messages.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">
              No messages yet. Start by asking a legal question.
            </p>
          </Card>
        ) : null}

        {messages.map((message, index) => (
          <Card className="space-y-1" key={`${message.role}-${index}`}>
            <p className="text-xs font-medium uppercase text-slate-500">{message.role}</p>
            <p className="text-sm text-slate-800">{message.text}</p>
            {message.role === 'assistant' ? (
              <>
                <p className="text-xs text-slate-500">
                  Confidence: {Math.round(message.confidence * 100)}%
                </p>
                {message.sourceId ? (
                  <p className="text-xs text-slate-500">Source: {message.sourceId}</p>
                ) : null}
                <p className="text-xs text-amber-700">{message.disclaimer}</p>
              </>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
