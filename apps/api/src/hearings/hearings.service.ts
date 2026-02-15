import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateHearingDto } from './dto/create-hearing.dto';
import { UpdateHearingStatusDto } from './dto/update-hearing-status.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class HearingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly auditLogService: AuditLogService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private makeRoomUrl(caseId: string, roomLabel?: string) {
    const base = process.env.VIRTUAL_HEARING_BASE_URL ?? 'https://meet.jit.si';
    const label = (roomLabel ?? `legalmitra-${caseId.slice(0, 8)}-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-');
    return `${base.replace(/\/$/, '')}/${label}`;
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
}
