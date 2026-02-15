'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type OdrRoom = {
  id: string;
  title: string;
  counterpartyEmail: string;
  createdAt: string;
};

type OdrMessage = {
  id: string;
  roomId: string;
  senderUserId: string;
  message: string;
  createdAt: string;
};

type OdrSettlement = {
  id: string;
  terms: string;
  aiMediatorSuggestion: string | null;
  status: 'pending' | 'accepted' | 'rejected' | string;
  decidedAt: string | null;
  createdAt: string;
  downloadUrl: string | null;
};

type OdrPrediction = {
  roomId: string;
  prediction: {
    successProbability: number;
    similarCases: number;
    model: string;
    disclaimer: string;
  };
  context: {
    messageCount: number;
    court: string;
    year: number;
    actsCitedCount: number;
    priorHearings: number;
  };
};

export default function OdrPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [counterpartyEmail, setCounterpartyEmail] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [message, setMessage] = useState('');
  const [settlementTerms, setSettlementTerms] = useState('');
  const [roomPrediction, setRoomPrediction] = useState<OdrPrediction | null>(null);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['odr-rooms'],
    queryFn: async () => (await api.get<OdrRoom[]>('/odr/rooms')).data,
  });

  const { data: messages } = useQuery({
    queryKey: ['odr-messages', selectedRoom],
    enabled: Boolean(selectedRoom),
    queryFn: async () => (await api.get<OdrMessage[]>(`/odr/rooms/${selectedRoom}/messages`)).data,
  });

  const { data: settlements } = useQuery({
    queryKey: ['odr-settlements', selectedRoom],
    enabled: Boolean(selectedRoom),
    queryFn: async () =>
      (await api.get<OdrSettlement[]>(`/odr/rooms/${selectedRoom}/settlements`)).data,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      (await api.post<OdrRoom>('/odr/rooms', { title, counterpartyEmail })).data,
    onSuccess: async (room) => {
      toast.success('Dispute room created');
      setTitle('');
      setCounterpartyEmail('');
      setSelectedRoom(room.id);
      await queryClient.invalidateQueries({ queryKey: ['odr-rooms'] });
    },
    onError: () => toast.error('Failed to create room'),
  });

  const sendMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/odr/rooms/${selectedRoom}/messages`, { message })).data,
    onSuccess: async () => {
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['odr-messages', selectedRoom] });
    },
    onError: () => toast.error('Failed to send message'),
  });

  const settlementMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/odr/rooms/${selectedRoom}/settlement`, {
          terms: settlementTerms || 'Draft settlement terms',
        })
      ).data,
    onSuccess: async () => {
      toast.success('Settlement proposal generated');
      setSettlementTerms('');
      await queryClient.invalidateQueries({ queryKey: ['odr-settlements', selectedRoom] });
    },
    onError: () => toast.error('Failed to generate settlement'),
  });

  const decideMutation = useMutation({
    mutationFn: async ({
      settlementId,
      decision,
    }: {
      settlementId: string;
      decision: 'accepted' | 'rejected';
    }) =>
      (
        await api.post(`/odr/rooms/${selectedRoom}/settlements/${settlementId}/decision`, {
          decision,
        })
      ).data,
    onSuccess: async () => {
      toast.success('Settlement status updated');
      await queryClient.invalidateQueries({ queryKey: ['odr-settlements', selectedRoom] });
    },
    onError: () => toast.error('Failed to update settlement status'),
  });

  const predictionMutation = useMutation({
    mutationFn: async () =>
      (await api.get<OdrPrediction>(`/odr/rooms/${selectedRoom}/prediction`)).data,
    onSuccess: (result) => {
      setRoomPrediction(result);
      toast.success('Prediction context loaded');
    },
    onError: () => toast.error('Failed to fetch prediction context'),
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">ODR Dispute Rooms</h1>

      <Card className="space-y-3">
        <h2 className="text-lg font-medium">Create Dispute Room</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Room title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Counterparty email"
            value={counterpartyEmail}
            onChange={(e) => setCounterpartyEmail(e.target.value)}
          />
        </div>
        <Button onClick={() => createMutation.mutate()} type="button" variant="outline">
          {createMutation.isPending ? 'Creating...' : 'Create Room'}
        </Button>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="text-lg font-medium">My Rooms</h2>
          {isLoading ? <p className="text-sm text-slate-500">Loading rooms...</p> : null}
          {rooms?.map((room) => (
            <button
              key={room.id}
              className={`w-full rounded border px-3 py-2 text-left text-sm ${selectedRoom === room.id ? 'border-slate-800' : 'border-slate-300'}`}
              onClick={() => setSelectedRoom(room.id)}
              type="button"
            >
              <p className="font-medium">{room.title}</p>
              <p className="text-xs text-slate-500">{room.counterpartyEmail}</p>
            </button>
          ))}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-medium">Room Messages</h2>
          {!selectedRoom ? <p className="text-sm text-slate-500">Select a room.</p> : null}
          {messages?.map((item) => (
            <p className="text-sm text-slate-700" key={item.id}>
              {new Date(item.createdAt).toLocaleTimeString()} • {item.message}
            </p>
          ))}
          {selectedRoom ? (
            <>
              <Input
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={() => sendMutation.mutate()} type="button" variant="outline">
                  Send Message
                </Button>
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-medium">Settlement Agreement Lifecycle</h2>
        {!selectedRoom ? (
          <p className="text-sm text-slate-500">Select a room to manage settlements.</p>
        ) : null}

        {selectedRoom ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Settlement Terms</label>
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                onChange={(event) => setSettlementTerms(event.target.value)}
                placeholder="Enter proposed settlement terms"
                value={settlementTerms}
              />
              <Button onClick={() => settlementMutation.mutate()} type="button" variant="outline">
                {settlementMutation.isPending ? 'Generating...' : 'Generate Settlement Agreement'}
              </Button>
              <Button
                disabled={predictionMutation.isPending}
                onClick={() => predictionMutation.mutate()}
                type="button"
                variant="outline"
              >
                {predictionMutation.isPending ? 'Loading...' : 'Load Prediction Context'}
              </Button>
            </div>

            {roomPrediction ? (
              <div className="rounded border border-slate-200 p-3 text-sm text-slate-700">
                <p className="font-medium">Prediction Coupling</p>
                <p>
                  Success probability:{' '}
                  {(roomPrediction.prediction.successProbability * 100).toFixed(0)}%
                </p>
                <p>Similar cases: {roomPrediction.prediction.similarCases}</p>
                <p>Model: {roomPrediction.prediction.model}</p>
                <p>
                  Context: {roomPrediction.context.court} • acts{' '}
                  {roomPrediction.context.actsCitedCount}
                  {' • '}hearings {roomPrediction.context.priorHearings}
                </p>
                <p className="text-xs text-slate-500">{roomPrediction.prediction.disclaimer}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Settlement Proposals</p>
              {!settlements?.length ? (
                <p className="text-sm text-slate-500">No settlement proposals yet.</p>
              ) : (
                <div className="space-y-2">
                  {settlements.map((item) => (
                    <div className="rounded border border-slate-200 p-3" key={item.id}>
                      <p className="text-sm text-slate-700">{item.terms}</p>
                      {item.aiMediatorSuggestion ? (
                        <p className="mt-1 text-xs text-slate-500">
                          AI mediator: {item.aiMediatorSuggestion}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        Status: {item.status}
                        {item.decidedAt ? ` • ${new Date(item.decidedAt).toLocaleString()}` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.downloadUrl ? (
                          <a
                            className="text-sm text-blue-700 underline"
                            href={item.downloadUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open Agreement PDF
                          </a>
                        ) : null}
                        {item.status === 'pending' ? (
                          <>
                            <Button
                              disabled={decideMutation.isPending}
                              onClick={() =>
                                decideMutation.mutate({
                                  settlementId: item.id,
                                  decision: 'accepted',
                                })
                              }
                              type="button"
                              variant="outline"
                            >
                              Accept
                            </Button>
                            <Button
                              disabled={decideMutation.isPending}
                              onClick={() =>
                                decideMutation.mutate({
                                  settlementId: item.id,
                                  decision: 'rejected',
                                })
                              }
                              type="button"
                              variant="outline"
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </Card>
    </section>
  );
}
