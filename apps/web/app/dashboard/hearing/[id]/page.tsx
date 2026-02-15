'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';

type Hearing = {
  id: string;
  caseId: string;
  caseNumber: string;
  courtCode: string;
  scheduledAt: string;
  roomUrl: string;
  status: string;
  recordingUrl?: string | null;
  transcript?: string | null;
};

type TokenResponse = {
  roomName: string;
  token: string | null;
  url: string;
  provider: 'livekit' | 'fallback_url';
  message?: string;
};

export default function HearingRoomPage() {
  const params = useParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ at: string; text: string }>>([]);

  const { data: hearing, isLoading } = useQuery({
    queryKey: ['hearing-room', params.id],
    queryFn: async () => (await api.get<Hearing>(`/hearings/${params.id}`)).data,
  });

  const tokenMutation = useMutation({
    mutationFn: async () => (await api.post<TokenResponse>(`/hearings/${params.id}/token`)).data,
  });

  const canJoinLink = useMemo(() => {
    if (!tokenMutation.data) return null;
    if (tokenMutation.data.provider === 'livekit') {
      return `${tokenMutation.data.url}?room=${encodeURIComponent(tokenMutation.data.roomName)}&token=${encodeURIComponent(tokenMutation.data.token ?? '')}`;
    }
    return tokenMutation.data.url;
  }, [tokenMutation.data]);

  if (isLoading) return <p className="text-sm text-slate-500">Loading hearing room...</p>;
  if (!hearing) return <p className="text-sm text-rose-600">Hearing not found.</p>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Virtual Courtroom</h1>
        <Button onClick={() => tokenMutation.mutate()} type="button" variant="outline">
          {tokenMutation.isPending ? 'Generating Access...' : 'Generate Room Access'}
        </Button>
      </div>

      <Card className="space-y-1 text-sm">
        <p>
          <strong>Case:</strong> {hearing.caseNumber} ({hearing.courtCode})
        </p>
        <p>
          <strong>Scheduled At:</strong> {new Date(hearing.scheduledAt).toLocaleString()}
        </p>
        <p>
          <strong>Status:</strong> {hearing.status}
        </p>
      </Card>

      {tokenMutation.data ? (
        <Card className="space-y-2">
          <p className="text-sm text-slate-700">
            Provider: {tokenMutation.data.provider}
            {tokenMutation.data.message ? ` • ${tokenMutation.data.message}` : ''}
          </p>
          {canJoinLink ? (
            <a
              className="text-sm text-blue-700 underline"
              href={canJoinLink}
              rel="noreferrer"
              target="_blank"
            >
              Join Hearing Room
            </a>
          ) : null}
        </Card>
      ) : null}

      <Card className="space-y-2">
        <h2 className="text-lg font-medium">Hearing Chat</h2>
        <div className="max-h-64 space-y-2 overflow-auto rounded border border-slate-200 p-3">
          {!messages.length ? <p className="text-sm text-slate-500">No messages yet.</p> : null}
          {messages.map((item, index) => (
            <p className="text-sm text-slate-700" key={`${item.at}-${index}`}>
              {new Date(item.at).toLocaleTimeString()} • {item.text}
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message"
            value={message}
          />
          <Button
            onClick={() => {
              if (!message.trim()) return;
              setMessages((prev) => [
                ...prev,
                { at: new Date().toISOString(), text: message.trim() },
              ]);
              setMessage('');
            }}
            type="button"
            variant="outline"
          >
            Send
          </Button>
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-medium">Live Transcript</h2>
        <p className="text-sm text-slate-700">
          {hearing.transcript ?? 'Transcript will appear as available.'}
        </p>
      </Card>
    </section>
  );
}
