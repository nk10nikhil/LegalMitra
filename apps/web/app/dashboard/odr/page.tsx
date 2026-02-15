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

export default function OdrPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [counterpartyEmail, setCounterpartyEmail] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [message, setMessage] = useState('');

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['odr-rooms'],
    queryFn: async () => (await api.get<OdrRoom[]>('/odr/rooms')).data,
  });

  const { data: messages } = useQuery({
    queryKey: ['odr-messages', selectedRoom],
    enabled: Boolean(selectedRoom),
    queryFn: async () => (await api.get<OdrMessage[]>(`/odr/rooms/${selectedRoom}/messages`)).data,
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
          terms: message || 'Draft settlement terms',
        })
      ).data,
    onSuccess: () => toast.success('Settlement proposal generated'),
    onError: () => toast.error('Failed to generate settlement'),
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

        <Card className="space-y-2">
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
                <Button onClick={() => settlementMutation.mutate()} type="button" variant="outline">
                  Suggest Settlement
                </Button>
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
