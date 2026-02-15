import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateHearingDto } from './dto/create-hearing.dto';
import { IngestTranscriptDto } from './dto/ingest-transcript.dto';
import { UpdateHearingStatusDto } from './dto/update-hearing-status.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { AccessToken } from 'livekit-server-sdk';
import { UploadHearingEvidenceDto } from './dto/upload-hearing-evidence.dto';

@Injectable()
export class HearingsService {
  private readonly storageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'legal-documents';
  private readonly aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly auditLogService: AuditLogService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private getStorageClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return null;
    }
    return createClient(supabaseUrl, serviceRoleKey);
  }

  private async resolveOwnedHearing(userId: string, hearingId: string) {
    const hearing = await this.prisma.hearing.findFirst({ where: { id: hearingId } });
    if (!hearing) throw new NotFoundException('Hearing not found');

    const ownedCase = await this.prisma.case.findFirst({
      where: { id: hearing.caseId, userId },
      select: { id: true, userId: true, caseNumber: true, courtCode: true },
    });

    if (!ownedCase) throw new NotFoundException('Hearing not found');
    return { hearing, ownedCase };
  }

  private async toEvidenceResponse(row: {
    id: string;
    type: string;
    title: string;
    fileUrl: string;
    formData: any;
    createdAt: Date;
  }) {
    let downloadUrl: string | null = null;

    if (row.fileUrl.startsWith('supabase://')) {
      const storageClient = this.getStorageClient();
      if (storageClient) {
        const storagePath = row.fileUrl.replace(`supabase://${this.storageBucket}/`, '');
        const expirySeconds = Number(
          process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS ?? 60 * 60 * 24 * 7,
        );
        const { data } = await storageClient.storage
          .from(this.storageBucket)
          .createSignedUrl(storagePath, expirySeconds);
        downloadUrl = data?.signedUrl ?? null;
      }
    }

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      fileUrl: row.fileUrl,
      downloadUrl,
      createdAt: row.createdAt,
      hearingId: row.formData?.hearingId ?? null,
      contentType: row.formData?.contentType ?? null,
      size: row.formData?.size ?? null,
      originalName: row.formData?.originalName ?? null,
    };
  }

  private makeRoomUrl(caseId: string, roomLabel?: string) {
    const base = process.env.VIRTUAL_HEARING_BASE_URL ?? 'https://meet.jit.si';
    const label = (roomLabel ?? `legalmitra-${caseId.slice(0, 8)}-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-');
    return `${base.replace(/\/$/, '')}/${label}`;
  }

  private parseWebhookTimestamp(input: unknown): Date | null {
    if (typeof input === 'string' && input.trim()) {
      const parsed = new Date(input);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof input === 'number' && Number.isFinite(input)) {
      if (input > 1_000_000_000_000) {
        const parsed = new Date(input);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      if (input > 1_000_000_000) {
        const parsed = new Date(input * 1000);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }

    return null;
  }

  private summarizeTranscriptLines(lines: string[]) {
    if (!lines.length) return 'No transcript content available yet.';

    const first = lines.slice(0, 2).join(' ');
    const middleIndex = Math.floor(lines.length / 2);
    const middle = lines[middleIndex] ?? '';
    const last = lines.slice(-2).join(' ');

    const joined = [first, middle, last]
      .map((item) => item.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (joined.length <= 340) return joined;
    return `${joined.slice(0, 337).trimEnd()}...`;
  }

  async listTranscriptSegments(userId: string, hearingId: string) {
    await this.resolveOwnedHearing(userId, hearingId);

    const rows = await this.prisma.hearingTranscriptSegment.findMany({
      where: { hearingId },
      orderBy: [{ startedAt: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      hearingId: row.hearingId,
      speaker: row.speaker,
      text: row.text,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      confidence: row.confidence,
      source: row.source,
      sourceEventId: row.sourceEventId,
      createdAt: row.createdAt,
    }));
  }

  async getTranscriptInsights(userId: string, hearingId: string) {
    await this.resolveOwnedHearing(userId, hearingId);

    const rows = await this.prisma.hearingTranscriptSegment.findMany({
      where: { hearingId },
      orderBy: [{ startedAt: 'asc' }, { createdAt: 'asc' }],
    });

    const segmentCount = rows.length;
    const speakers = new Map<string, { count: number }>();

    let confidenceTotal = 0;
    let confidenceCount = 0;
    for (const row of rows) {
      const speaker = row.speaker?.trim() || 'Unknown';
      const existing = speakers.get(speaker) ?? { count: 0 };
      existing.count += 1;
      speakers.set(speaker, existing);

      if (typeof row.confidence === 'number') {
        confidenceTotal += row.confidence;
        confidenceCount += 1;
      }
    }

    const speakerStats = Array.from(speakers.entries())
      .map(([speaker, value]) => ({ speaker, segmentCount: value.count }))
      .sort((a, b) => b.segmentCount - a.segmentCount)
      .slice(0, 5);

    const startedValues = rows.map((item) => item.startedAt?.getTime()).filter(Boolean) as number[];
    const endedValues = rows.map((item) => item.endedAt?.getTime()).filter(Boolean) as number[];
    const startedAt = startedValues.length ? Math.min(...startedValues) : null;
    const endedAt = endedValues.length ? Math.max(...endedValues) : null;

    const durationSeconds =
      typeof startedAt === 'number' && typeof endedAt === 'number' && endedAt >= startedAt
        ? Math.round((endedAt - startedAt) / 1000)
        : null;

    const textLines = rows.map((item) => `${item.speaker ? `${item.speaker}: ` : ''}${item.text}`);

    return {
      hearingId,
      segmentCount,
      speakerCount: speakers.size,
      averageConfidence: confidenceCount
        ? Number((confidenceTotal / confidenceCount).toFixed(3))
        : null,
      durationSeconds,
      topSpeakers: speakerStats,
      summary: this.summarizeTranscriptLines(textLines),
      generatedAt: new Date().toISOString(),
    };
  }

  async ingestManualTranscript(userId: string, hearingId: string, dto: IngestTranscriptDto) {
    const { hearing } = await this.resolveOwnedHearing(userId, hearingId);

    const raw = dto.text?.trim();
    if (!raw) throw new BadRequestException('Transcript text is required');

    let normalizedText = raw;
    try {
      const response = await axios.post<{ transcript: string }>(`${this.aiUrl}/transcribe`, {
        text: raw,
        language: dto.language ?? 'en',
      });
      normalizedText = response.data.transcript?.trim() || raw;
    } catch {
      // fallback to raw input
    }

    const lines = normalizedText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 1000);

    const source = dto.source?.trim() || 'manual_upload';

    const segments = lines.map((line, index) => {
      const match = line.match(/^([^:]{1,40}):\s+(.+)$/);
      const speaker = match ? match[1].trim() : null;
      const text = match ? match[2].trim() : line;

      return {
        hearingId: hearing.id,
        speaker,
        text,
        startedAt: null,
        endedAt: null,
        confidence: null,
        source,
        sourceEventId: `${source}-${Date.now()}-${index}`,
      };
    });

    if (!segments.length) throw new BadRequestException('Transcript contains no valid lines');

    await this.prisma.hearingTranscriptSegment.createMany({ data: segments });

    const previous = hearing.transcript?.trim();
    const withPrefix = `[${new Date().toISOString()}] ${normalizedText}`;
    const transcript = previous ? `${previous}\n${withPrefix}` : withPrefix;

    await this.prisma.hearing.update({
      where: { id: hearing.id },
      data: { transcript },
    });

    await this.auditLogService.log({
      userId,
      action: 'hearing.transcript.manual_ingest',
      resource: `hearings:${hearing.id}`,
      metadata: {
        source,
        segmentCount: segments.length,
      },
    });

    this.realtimeService.emitToUser(userId, 'hearing.transcript_updated', {
      hearingId: hearing.id,
      caseId: hearing.caseId,
      source,
    });

    return {
      accepted: true,
      hearingId: hearing.id,
      source,
      segmentsIngested: segments.length,
    };
  }

  async create(userId: string, dto: CreateHearingDto) {
    await this.profilesService.ensureProfile(userId);

    const ownedCase = await this.prisma.case.findFirst({
      where: { id: dto.caseId, userId },
      select: { id: true, caseNumber: true, courtCode: true, userId: true },
    });

    if (!ownedCase) {
      throw new NotFoundException('Case not found');
    }

    const roomUrl = this.makeRoomUrl(ownedCase.id, dto.roomLabel);

    const hearing = await this.prisma.hearing.create({
      data: {
        caseId: ownedCase.id,
        scheduledAt: new Date(dto.scheduledAt),
        roomUrl,
        status: 'scheduled',
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: ownedCase.userId,
        type: 'hearing_scheduled',
        content: {
          hearingId: hearing.id,
          caseId: ownedCase.id,
          caseNumber: ownedCase.caseNumber,
          courtCode: ownedCase.courtCode,
          scheduledAt: hearing.scheduledAt.toISOString(),
          roomUrl: hearing.roomUrl,
        },
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'hearing.schedule',
      resource: `hearings:${hearing.id}`,
      metadata: {
        caseId: ownedCase.id,
        scheduledAt: hearing.scheduledAt.toISOString(),
      },
    });

    this.realtimeService.emitToUser(ownedCase.userId, 'hearing.scheduled', {
      hearingId: hearing.id,
      caseId: hearing.caseId,
      scheduledAt: hearing.scheduledAt.toISOString(),
      roomUrl: hearing.roomUrl,
    });

    return hearing;
  }

  async list(userId: string, caseId?: string) {
    await this.profilesService.ensureProfile(userId);

    const cases = await this.prisma.case.findMany({
      where: caseId ? { id: caseId, userId } : { userId },
      select: { id: true, caseNumber: true, courtCode: true },
    });

    if (caseId && !cases.length) {
      throw new NotFoundException('Case not found');
    }

    const caseMap = new Map(cases.map((item) => [item.id, item]));
    const caseIds = cases.map((item) => item.id);

    if (!caseIds.length) {
      return [];
    }

    const hearings = await this.prisma.hearing.findMany({
      where: { caseId: { in: caseIds } },
      orderBy: { scheduledAt: 'desc' },
    });

    return hearings.map((hearing) => ({
      id: hearing.id,
      caseId: hearing.caseId,
      caseNumber: caseMap.get(hearing.caseId)?.caseNumber ?? null,
      courtCode: caseMap.get(hearing.caseId)?.courtCode ?? null,
      scheduledAt: hearing.scheduledAt,
      roomUrl: hearing.roomUrl,
      status: hearing.status,
      recordingUrl: hearing.recordingUrl,
      transcript: hearing.transcript,
    }));
  }

  async getOne(userId: string, hearingId: string) {
    await this.profilesService.ensureProfile(userId);

    const hearing = await this.prisma.hearing.findFirst({
      where: { id: hearingId },
    });

    if (!hearing) throw new NotFoundException('Hearing not found');

    const ownedCase = await this.prisma.case.findFirst({
      where: { id: hearing.caseId, userId },
      select: { id: true, caseNumber: true, courtCode: true },
    });

    if (!ownedCase) throw new NotFoundException('Hearing not found');

    return {
      id: hearing.id,
      caseId: hearing.caseId,
      caseNumber: ownedCase.caseNumber,
      courtCode: ownedCase.courtCode,
      scheduledAt: hearing.scheduledAt,
      roomUrl: hearing.roomUrl,
      status: hearing.status,
      recordingUrl: hearing.recordingUrl,
      transcript: hearing.transcript,
    };
  }

  async listEvidence(userId: string, hearingId: string) {
    const { ownedCase } = await this.resolveOwnedHearing(userId, hearingId);

    const rows = await this.prisma.document.findMany({
      where: {
        userId,
        caseId: ownedCase.id,
        type: 'hearing_evidence',
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = rows.filter((row) => (row.formData as any)?.hearingId === hearingId);
    return Promise.all(filtered.map((row) => this.toEvidenceResponse(row)));
  }

  async uploadEvidence(
    userId: string,
    hearingId: string,
    file: Express.Multer.File,
    dto: UploadHearingEvidenceDto,
  ) {
    if (!file) throw new BadRequestException('Evidence file is required');
    if (file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('Evidence file must be less than 25MB');
    }

    const { ownedCase } = await this.resolveOwnedHearing(userId, hearingId);
    await this.profilesService.ensureProfile(userId);

    const storageClient = this.getStorageClient();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const storagePath = `${userId}/hearings/${hearingId}/${Date.now()}-${sanitizedName}`;

    let fileUrl = `inline://${sanitizedName}`;
    let downloadUrl: string | null = null;

    if (storageClient) {
      const { error } = await storageClient.storage
        .from(this.storageBucket)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype || 'application/octet-stream',
          upsert: false,
        });

      if (!error) {
        fileUrl = `supabase://${this.storageBucket}/${storagePath}`;
        const expirySeconds = Number(
          process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS ?? 60 * 60 * 24 * 7,
        );
        const { data } = await storageClient.storage
          .from(this.storageBucket)
          .createSignedUrl(storagePath, expirySeconds);
        downloadUrl = data?.signedUrl ?? null;
      }
    }

    const row = await this.prisma.document.create({
      data: {
        userId,
        caseId: ownedCase.id,
        type: 'hearing_evidence',
        title: dto.title?.trim() || `Evidence - ${file.originalname}`,
        fileUrl,
        formData: {
          hearingId,
          originalName: file.originalname,
          contentType: file.mimetype || null,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'hearing.evidence.upload',
      resource: `hearings:${hearingId}`,
      metadata: {
        documentId: row.id,
        title: row.title,
        contentType: file.mimetype || null,
        size: file.size,
      },
    });

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      fileUrl: row.fileUrl,
      downloadUrl,
      createdAt: row.createdAt,
      hearingId,
      contentType: file.mimetype || null,
      size: file.size,
      originalName: file.originalname,
    };
  }

  async generateRoomToken(userId: string, hearingId: string) {
    const hearing = await this.getOne(userId, hearingId);

    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!livekitApiKey || !livekitApiSecret || !livekitUrl) {
      return {
        roomName: hearing.id,
        token: null,
        url: hearing.roomUrl,
        provider: 'fallback_url',
        message: 'LiveKit is not configured. Using room URL fallback.',
      };
    }

    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: userId,
      ttl: '2h',
    });
    at.addGrant({
      roomJoin: true,
      room: hearing.id,
      canPublish: true,
      canSubscribe: true,
    });

    await this.auditLogService.log({
      userId,
      action: 'hearing.token.generate',
      resource: `hearings:${hearing.id}`,
    });

    return {
      roomName: hearing.id,
      token: await at.toJwt(),
      url: livekitUrl,
      provider: 'livekit',
    };
  }

  async updateStatus(userId: string, hearingId: string, dto: UpdateHearingStatusDto) {
    await this.profilesService.ensureProfile(userId);

    const hearing = await this.prisma.hearing.findFirst({
      where: { id: hearingId },
      select: { id: true, caseId: true },
    });

    if (!hearing) {
      throw new NotFoundException('Hearing not found');
    }

    const ownedCase = await this.prisma.case.findFirst({
      where: { id: hearing.caseId, userId },
      select: { id: true, userId: true },
    });

    if (!ownedCase) {
      throw new NotFoundException('Hearing not found');
    }

    const updated = await this.prisma.hearing.update({
      where: { id: hearing.id },
      data: {
        status: dto.status,
        recordingUrl: dto.recordingUrl,
        transcript: dto.transcript,
      },
    });

    if (dto.status !== 'scheduled') {
      await this.prisma.notification.create({
        data: {
          userId: ownedCase.userId,
          type: 'hearing_status_updated',
          content: {
            hearingId: updated.id,
            caseId: updated.caseId,
            status: updated.status,
            recordingUrl: updated.recordingUrl,
          },
        },
      });
    }

    await this.auditLogService.log({
      userId,
      action: 'hearing.status_update',
      resource: `hearings:${updated.id}`,
      metadata: {
        status: updated.status,
      },
    });

    this.realtimeService.emitToUser(ownedCase.userId, 'hearing.status_updated', {
      hearingId: updated.id,
      caseId: updated.caseId,
      status: updated.status,
      recordingUrl: updated.recordingUrl,
    });

    return updated;
  }

  async handleLivekitWebhook(payload: Record<string, any>, webhookToken?: string) {
    const configuredToken = process.env.LIVEKIT_WEBHOOK_TOKEN;
    if (configuredToken && webhookToken !== configuredToken) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    const roomName =
      payload?.room?.name ??
      payload?.room_name ??
      payload?.event?.room?.name ??
      payload?.room?.metadata?.roomName ??
      null;

    if (!roomName) {
      return { accepted: true, processed: false, reason: 'room_name_missing' };
    }

    const hearing = await this.prisma.hearing.findFirst({ where: { id: roomName } });
    if (!hearing) {
      return { accepted: true, processed: false, reason: 'hearing_not_found', roomName };
    }

    const sourceEventId =
      payload?.event?.id ?? payload?.id ?? payload?.event_id ?? payload?.webhook_id ?? null;

    if (sourceEventId) {
      const duplicateCount = await this.prisma.hearingTranscriptSegment.count({
        where: {
          hearingId: hearing.id,
          sourceEventId: String(sourceEventId),
        },
      });

      if (duplicateCount > 0) {
        return {
          accepted: true,
          processed: false,
          reason: 'duplicate_event',
          roomName,
          sourceEventId: String(sourceEventId),
        };
      }
    }

    const transcriptSegmentsRaw =
      payload?.transcription?.segments ?? payload?.segments ?? payload?.transcript?.segments ?? [];

    const normalizedSegments = Array.isArray(transcriptSegmentsRaw)
      ? transcriptSegmentsRaw
          .map((item: any) => {
            const text = typeof item?.text === 'string' ? item.text.trim() : '';
            if (!text) return null;

            const speakerRaw =
              item?.speaker ?? item?.speaker_id ?? item?.participant_identity ?? item?.identity;
            const speaker = typeof speakerRaw === 'string' && speakerRaw.trim() ? speakerRaw : null;

            const startedAt = this.parseWebhookTimestamp(
              item?.start_time ?? item?.startTime ?? item?.start ?? item?.from,
            );
            const endedAt = this.parseWebhookTimestamp(
              item?.end_time ?? item?.endTime ?? item?.end ?? item?.to,
            );

            const confidenceValue = Number(item?.confidence);
            const confidence = Number.isFinite(confidenceValue) ? confidenceValue : null;

            return {
              hearingId: hearing.id,
              speaker,
              text,
              startedAt,
              endedAt,
              confidence,
              source: 'livekit_webhook',
              sourceEventId: sourceEventId ? String(sourceEventId) : null,
            };
          })
          .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment))
      : [];

    if (normalizedSegments.length) {
      await this.prisma.hearingTranscriptSegment.createMany({
        data: normalizedSegments,
      });
    }

    const transcriptFromSegments = normalizedSegments.length
      ? normalizedSegments
          .map((item) => `${item.speaker ? `${item.speaker}: ` : ''}${item.text}`)
          .join(' ')
      : '';

    const rawText =
      transcriptFromSegments ||
      payload?.transcript?.text ||
      payload?.text ||
      payload?.event?.text ||
      '';

    if (!rawText || !String(rawText).trim()) {
      return { accepted: true, processed: false, reason: 'transcript_missing', roomName };
    }

    let normalizedText = String(rawText).trim();
    try {
      const response = await axios.post<{ transcript: string; model: string }>(
        `${this.aiUrl}/transcribe`,
        {
          text: normalizedText,
          language: payload?.language ?? payload?.transcription?.language ?? 'en',
        },
      );
      normalizedText = response.data.transcript?.trim() || normalizedText;
    } catch {
      // fallback to raw transcript text if AI service normalization fails
    }

    const previous = hearing.transcript?.trim();
    const withPrefix = `[${new Date().toISOString()}] ${normalizedText}`;
    const updatedTranscript = previous ? `${previous}\n${withPrefix}` : withPrefix;

    const updated = await this.prisma.hearing.update({
      where: { id: hearing.id },
      data: { transcript: updatedTranscript },
    });

    const caseRow = await this.prisma.case.findFirst({
      where: { id: hearing.caseId },
      select: { userId: true },
    });

    if (caseRow?.userId) {
      this.realtimeService.emitToUser(caseRow.userId, 'hearing.transcript_updated', {
        hearingId: updated.id,
        caseId: updated.caseId,
      });
    }

    await this.auditLogService.log({
      action: 'hearing.transcript.ingested',
      resource: `hearings:${updated.id}`,
      metadata: {
        roomName,
        length: normalizedText.length,
        segmentCount: normalizedSegments.length,
        sourceEventId: sourceEventId ? String(sourceEventId) : null,
      },
    });

    return { accepted: true, processed: true, hearingId: updated.id };
  }
}
