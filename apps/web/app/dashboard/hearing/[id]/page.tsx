'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Button, Card, Input } from '@legalmitra/ui';
import { api } from '@/lib/api';
import { LocalTrackPublication, RemoteTrack, Room, RoomEvent, Track } from 'livekit-client';
import { toast } from 'sonner';

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

type HearingEvidence = {
  id: string;
  title: string;
  downloadUrl: string | null;
  originalName: string | null;
  contentType: string | null;
  size: number | null;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  at: string;
  text: string;
  sender: string;
};

type TranscriptSegment = {
  id: string;
  speaker: string | null;
  text: string;
  startedAt: string | null;
  endedAt: string | null;
  confidence: number | null;
  createdAt: string;
};

type TranscriptInsights = {
  hearingId: string;
  segmentCount: number;
  speakerCount: number;
  averageConfidence: number | null;
  durationSeconds: number | null;
  topSpeakers: Array<{ speaker: string; segmentCount: number }>;
  summary: string;
  generatedAt: string;
};

export default function HearingRoomPage() {
  const params = useParams<{ id: string }>();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<File | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [manualTranscriptText, setManualTranscriptText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'failed'
  >('idle');
  const [participantCount, setParticipantCount] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteVideoCount, setRemoteVideoCount] = useState(0);
  const localMediaRef = useRef<HTMLDivElement | null>(null);
  const remoteMediaRef = useRef<HTMLDivElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const attachedElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  const { data: hearing, isLoading } = useQuery({
    queryKey: ['hearing-room', params.id],
    queryFn: async () => (await api.get<Hearing>(`/hearings/${params.id}`)).data,
  });

  const { data: evidences, refetch: refetchEvidence } = useQuery({
    queryKey: ['hearing-evidence', params.id],
    enabled: Boolean(params.id),
    queryFn: async () => (await api.get<HearingEvidence[]>(`/hearings/${params.id}/evidence`)).data,
  });

  const { data: transcriptSegments } = useQuery({
    queryKey: ['hearing-transcript-segments', params.id],
    enabled: Boolean(params.id),
    queryFn: async () =>
      (await api.get<TranscriptSegment[]>(`/hearings/${params.id}/transcript-segments`)).data,
    refetchInterval: 5000,
  });

  const { data: transcriptInsights, refetch: refetchTranscriptInsights } = useQuery({
    queryKey: ['hearing-transcript-insights', params.id],
    enabled: Boolean(params.id),
    queryFn: async () =>
      (await api.get<TranscriptInsights>(`/hearings/${params.id}/transcript-insights`)).data,
    refetchInterval: 8000,
  });

  const tokenMutation = useMutation({
    mutationFn: async () => (await api.post<TokenResponse>(`/hearings/${params.id}/token`)).data,
  });

  const evidenceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEvidence) throw new Error('No file selected');
      const form = new FormData();
      form.append('file', selectedEvidence);
      if (evidenceTitle.trim()) {
        form.append('title', evidenceTitle.trim());
      }
      return (await api.post(`/hearings/${params.id}/evidence`, form)).data;
    },
    onSuccess: async () => {
      toast.success('Evidence uploaded');
      setSelectedEvidence(null);
      setEvidenceTitle('');
      await refetchEvidence();
    },
    onError: () => {
      toast.error('Failed to upload evidence');
    },
  });

  const manualTranscriptMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/hearings/${params.id}/transcript/manual`, {
          text: manualTranscriptText,
          source: 'manual_ui',
          language: 'en',
        })
      ).data,
    onSuccess: async () => {
      toast.success('Transcript ingested');
      setManualTranscriptText('');
      await refetchTranscriptInsights();
    },
    onError: () => {
      toast.error('Failed to ingest transcript');
    },
  });

  const canJoinLink = useMemo(() => {
    if (!tokenMutation.data) return null;
    if (tokenMutation.data.provider === 'livekit') {
      return `${tokenMutation.data.url}?room=${encodeURIComponent(tokenMutation.data.roomName)}&token=${encodeURIComponent(tokenMutation.data.token ?? '')}`;
    }
    return tokenMutation.data.url;
  }, [tokenMutation.data]);

  const attachTrackElement = (
    track: RemoteTrack | LocalTrackPublication['track'],
    key: string,
    container: HTMLDivElement | null,
  ) => {
    if (
      !track ||
      !container ||
      !(track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio)
    ) {
      return;
    }

    const existing = attachedElementsRef.current.get(key);
    if (existing) {
      existing.remove();
      attachedElementsRef.current.delete(key);
    }

    const element = track.attach();
    element.setAttribute('data-track-key', key);
    if (track.kind === Track.Kind.Video) {
      element.className =
        'h-44 w-full rounded border border-slate-200 object-cover dark:border-slate-700';
    } else {
      element.className = 'hidden';
    }

    container.appendChild(element);
    attachedElementsRef.current.set(key, element);
    if (container === remoteMediaRef.current) {
      setRemoteVideoCount(container.querySelectorAll('video').length);
    }
  };

  const detachTrackElement = (key: string) => {
    const node = attachedElementsRef.current.get(key);
    if (!node) return;
    node.remove();
    attachedElementsRef.current.delete(key);
    const remoteContainer = remoteMediaRef.current;
    if (remoteContainer) {
      setRemoteVideoCount(remoteContainer.querySelectorAll('video').length);
    }
  };

  useEffect(() => {
    const data = tokenMutation.data;
    if (!data || data.provider !== 'livekit' || !data.token) return;

    const room = new Room();
    roomRef.current = room;
    let active = true;

    setConnectionStatus('connecting');

    room
      .connect(data.url, data.token)
      .then(async () => {
        if (!active) return;
        setConnectionStatus('connected');
        setParticipantCount(room.remoteParticipants.size + 1);

        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        room.localParticipant.videoTrackPublications.forEach((publication) => {
          attachTrackElement(
            publication.track,
            `local-${publication.trackSid}`,
            localMediaRef.current,
          );
        });

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            attachTrackElement(
              publication.track as RemoteTrack,
              `remote-${participant.identity}-${publication.trackSid}`,
              remoteMediaRef.current,
            );
          });
        });
      })
      .catch(() => {
        if (!active) return;
        setConnectionStatus('failed');
      });

    room.on(RoomEvent.ParticipantConnected, () => {
      setParticipantCount(room.remoteParticipants.size + 1);
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      setParticipantCount(room.remoteParticipants.size + 1);
    });

    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      attachTrackElement(publication.track, `local-${publication.trackSid}`, localMediaRef.current);
    });

    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      detachTrackElement(`local-${publication.trackSid}`);
    });

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      attachTrackElement(
        track,
        `remote-${participant.identity}-${publication.trackSid}`,
        remoteMediaRef.current,
      );
    });

    room.on(RoomEvent.TrackUnsubscribed, (_track, publication, participant) => {
      detachTrackElement(`remote-${participant.identity}-${publication.trackSid}`);
    });

    room.on(RoomEvent.DataReceived, (payload, participant) => {
      const text = new TextDecoder().decode(payload);
      try {
        const parsed = JSON.parse(text) as { text?: string; at?: string };
        const parsedText = parsed.text;
        if (!parsedText) return;
        setMessages((prev) => [
          ...prev,
          {
            id: `${participant?.identity ?? 'participant'}-${Date.now()}`,
            at: parsed.at ?? new Date().toISOString(),
            text: parsedText,
            sender: participant?.identity ?? 'participant',
          },
        ]);
      } catch {
        // ignore malformed payload
      }
    });

    return () => {
      active = false;
      attachedElementsRef.current.forEach((element) => element.remove());
      attachedElementsRef.current.clear();
      setRemoteVideoCount(0);
      void room.disconnect();
      roomRef.current = null;
    };
  }, [tokenMutation.data]);

  const sendRoomMessage = async () => {
    const text = message.trim();
    if (!text) return;

    const room = roomRef.current;
    const payload = {
      text,
      at: new Date().toISOString(),
    };

    if (room && connectionStatus === 'connected') {
      await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)));
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `me-${Date.now()}`,
        at: payload.at,
        text: payload.text,
        sender: 'You',
      },
    ]);
    setMessage('');
  };

  const toggleScreenShare = async () => {
    const room = roomRef.current;
    if (!room || connectionStatus !== 'connected') return;
    const next = !isScreenSharing;
    try {
      await room.localParticipant.setScreenShareEnabled(next);
      setIsScreenSharing(next);
      toast.success(next ? 'Screen share started' : 'Screen share stopped');
    } catch {
      toast.error('Unable to toggle screen share');
    }
  };

  if (isLoading) return <p className="text-sm text-slate-500">Loading hearing room...</p>;
  if (!hearing) return <p className="text-sm text-rose-600">Hearing not found.</p>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Virtual Courtroom</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => tokenMutation.mutate()} type="button" variant="outline">
            {tokenMutation.isPending ? 'Generating Access...' : 'Generate Room Access'}
          </Button>
          <Button
            disabled={connectionStatus !== 'connected'}
            onClick={toggleScreenShare}
            type="button"
            variant="outline"
          >
            {isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
          </Button>
        </div>
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
          <p className="text-sm text-slate-700">
            Connection: {connectionStatus}
            {connectionStatus === 'connected' ? ` • Participants: ${participantCount}` : ''}
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="text-lg font-medium">Local Media</h2>
          <div className="grid gap-2" ref={localMediaRef} />
        </Card>
        <Card className="space-y-2">
          <h2 className="text-lg font-medium">Remote Participants ({remoteVideoCount})</h2>
          <div className="grid gap-2" ref={remoteMediaRef} />
        </Card>
      </div>

      <Card className="space-y-2">
        <h2 className="text-lg font-medium">Hearing Chat</h2>
        <div className="max-h-64 space-y-2 overflow-auto rounded border border-slate-200 p-3">
          {!messages.length ? <p className="text-sm text-slate-500">No messages yet.</p> : null}
          {messages.map((item) => (
            <p className="text-sm text-slate-700" key={item.id}>
              {new Date(item.at).toLocaleTimeString()} • <strong>{item.sender}</strong>: {item.text}
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message"
            value={message}
          />
          <Button onClick={sendRoomMessage} type="button" variant="outline">
            Send
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-medium">Evidence Upload</h2>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input
            onChange={(event) => setEvidenceTitle(event.target.value)}
            placeholder="Evidence title (optional)"
            value={evidenceTitle}
          />
          <Input
            onChange={(event) => setSelectedEvidence(event.target.files?.[0] ?? null)}
            type="file"
          />
          <Button
            disabled={!selectedEvidence || evidenceMutation.isPending}
            onClick={() => evidenceMutation.mutate()}
            type="button"
            variant="outline"
          >
            {evidenceMutation.isPending ? 'Uploading...' : 'Upload Evidence'}
          </Button>
        </div>
        <div className="space-y-2">
          {!evidences?.length ? (
            <p className="text-sm text-slate-500">No evidence uploaded yet.</p>
          ) : null}
          {evidences?.map((evidence) => (
            <div
              className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm"
              key={evidence.id}
            >
              <div>
                <p className="font-medium text-slate-700">{evidence.title}</p>
                <p className="text-xs text-slate-500">
                  {evidence.originalName ?? 'file'}
                  {typeof evidence.size === 'number'
                    ? ` • ${Math.ceil(evidence.size / 1024)} KB`
                    : ''}
                </p>
              </div>
              {evidence.downloadUrl ? (
                <a
                  className="text-blue-700 underline"
                  href={evidence.downloadUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open
                </a>
              ) : (
                <span className="text-xs text-slate-500">Stored</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-medium">Live Transcript</h2>
        {transcriptSegments?.length ? (
          <div className="max-h-72 space-y-2 overflow-auto rounded border border-slate-200 p-3">
            {transcriptSegments.map((segment) => (
              <div key={segment.id}>
                <p className="text-sm text-slate-700">
                  <strong>{segment.speaker ?? 'Speaker'}:</strong> {segment.text}
                </p>
                <p className="text-xs text-slate-500">
                  {segment.startedAt ? new Date(segment.startedAt).toLocaleTimeString() : 'No time'}
                  {typeof segment.confidence === 'number'
                    ? ` • confidence ${(segment.confidence * 100).toFixed(0)}%`
                    : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-700">
            {hearing.transcript ?? 'Transcript will appear as available.'}
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-medium">Transcript Ops</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">Manual Transcript Ingest</label>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
            onChange={(event) => setManualTranscriptText(event.target.value)}
            placeholder="Paste transcript lines (optional format: Speaker: text)"
            value={manualTranscriptText}
          />
          <Button
            disabled={!manualTranscriptText.trim() || manualTranscriptMutation.isPending}
            onClick={() => manualTranscriptMutation.mutate()}
            type="button"
            variant="outline"
          >
            {manualTranscriptMutation.isPending ? 'Ingesting...' : 'Ingest Transcript'}
          </Button>
        </div>

        {transcriptInsights ? (
          <div className="space-y-1 rounded border border-slate-200 p-3 text-sm">
            <p>
              Segments: {transcriptInsights.segmentCount} • Speakers:{' '}
              {transcriptInsights.speakerCount}
            </p>
            <p>
              Avg confidence:{' '}
              {typeof transcriptInsights.averageConfidence === 'number'
                ? `${(transcriptInsights.averageConfidence * 100).toFixed(0)}%`
                : 'N/A'}
              {' • '}Duration:{' '}
              {typeof transcriptInsights.durationSeconds === 'number'
                ? `${transcriptInsights.durationSeconds}s`
                : 'N/A'}
            </p>
            <p>Summary: {transcriptInsights.summary}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Transcript insights are not available yet.</p>
        )}
      </Card>
    </section>
  );
}
