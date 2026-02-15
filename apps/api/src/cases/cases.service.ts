import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { TrackCaseDto } from './dto/track-case.dto';
import { ECourtsService } from './ecourts.service';
import { AuditLogService } from '../common/audit-log.service';
import { AddCaseNoteDto } from './dto/add-case-note.dto';
import { GetCaseTimelineDto } from './dto/get-case-timeline.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly ecourtsService: ECourtsService,
    private readonly auditLogService: AuditLogService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private async getRole(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return profile?.role ?? 'citizen';
  }

  async track(userId: string, dto: TrackCaseDto) {
    await this.profilesService.ensureProfile(userId);

    const fetched = await this.ecourtsService.fetchCaseFromECourts({
      caseNumber: dto.caseNumber,
      courtCode: dto.courtCode,
    });

    const created = await this.prisma.case.create({
      data: {
        userId,
        caseNumber: dto.caseNumber,
        courtCode: dto.courtCode,
        caseData: fetched.raw as any,
        nextHearing: fetched.nextHearing,
        status: fetched.status,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'case.track',
      resource: `cases:${created.id}`,
      metadata: {
        caseNumber: created.caseNumber,
        courtCode: created.courtCode,
      },
    });

    return created;
  }

  async list(userId: string) {
    const rows = await this.prisma.case.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((item: (typeof rows)[number]) => ({
      id: item.id,
      caseNumber: item.caseNumber,
      courtCode: item.courtCode,
      status: item.status,
      nextHearing: item.nextHearing,
      lastSynced: item.lastSynced,
    }));
  }

  async detail(userId: string, id: string) {
    const row = await this.prisma.case.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Case not found');

    return {
      id: row.id,
      caseNumber: row.caseNumber,
      courtCode: row.courtCode,
      status: row.status,
      nextHearing: row.nextHearing,
      lastSynced: row.lastSynced,
      createdAt: row.createdAt,
      caseData: row.caseData,
    };
  }

  async timeline(userId: string, caseId: string, filters?: GetCaseTimelineDto) {
    await this.profilesService.ensureProfile(userId);

    const row = await this.prisma.case.findFirst({ where: { id: caseId, userId } });
    if (!row) throw new NotFoundException('Case not found');

    const [hearings, notes, documents, audits] = await this.prisma.$transaction([
      this.prisma.hearing.findMany({
        where: { caseId: row.id },
        orderBy: { scheduledAt: 'desc' },
      }),
      this.prisma.caseNote.findMany({
        where: { caseId: row.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.document.findMany({
        where: { caseId: row.id, userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: {
          resource: `cases:${row.id}`,
          action: { in: ['case.track', 'case.refresh'] },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const events: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      occurredAt: Date;
    }> = [];

    events.push({
      id: `case-created-${row.id}`,
      type: 'case_created',
      title: 'Case Added',
      description: `${row.caseNumber} (${row.courtCode}) tracked in LegalMitra.`,
      occurredAt: row.createdAt,
    });

    for (const hearing of hearings) {
      events.push({
        id: `hearing-${hearing.id}`,
        type: 'hearing',
        title: `Hearing ${hearing.status}`,
        description: `Scheduled at ${hearing.scheduledAt.toLocaleString()}${hearing.roomUrl ? ` • Room: ${hearing.roomUrl}` : ''}`,
        occurredAt: hearing.scheduledAt,
      });
    }

    for (const note of notes) {
      events.push({
        id: `note-${note.id}`,
        type: 'note',
        title: 'Lawyer Note Added',
        description: note.note,
        occurredAt: note.createdAt,
      });
    }

    for (const document of documents) {
      events.push({
        id: `document-${document.id}`,
        type: 'document',
        title: `Document Created (${document.type})`,
        description: document.title,
        occurredAt: document.createdAt,
      });
    }

    for (const audit of audits) {
      events.push({
        id: `audit-${audit.id}`,
        type: 'audit',
        title: audit.action,
        description: audit.resource,
        occurredAt: audit.createdAt,
      });
    }

    const fromDate = filters?.from ? new Date(filters.from) : null;
    const toDate = filters?.to ? new Date(filters.to) : null;

    const filtered = events
      .filter((event) => (filters?.type ? event.type === filters.type : true))
      .filter((event) => (fromDate ? event.occurredAt.getTime() >= fromDate.getTime() : true))
      .filter((event) => (toDate ? event.occurredAt.getTime() <= toDate.getTime() : true));

    filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    await this.auditLogService.log({
      userId,
      action: 'case.timeline.view',
      resource: `cases:${row.id}`,
      metadata: {
        eventCount: filtered.length,
        type: filters?.type ?? null,
        from: filters?.from ?? null,
        to: filters?.to ?? null,
      },
    });

    return filtered;
  }

  async refresh(userId: string, id: string) {
    const row = await this.prisma.case.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Case not found');

    const fetched = await this.ecourtsService.fetchCaseFromECourts({
      caseNumber: row.caseNumber,
      courtCode: row.courtCode,
    });

    const updated = await this.prisma.case.update({
      where: { id: row.id },
      data: {
        status: fetched.status,
        caseData: fetched.raw as any,
        nextHearing: fetched.nextHearing,
        lastSynced: new Date(),
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'case.refresh',
      resource: `cases:${updated.id}`,
      metadata: {
        status: updated.status,
        nextHearing: updated.nextHearing?.toISOString() ?? null,
      },
    });

    this.realtimeService.emitToUser(userId, 'case.updated', {
      caseId: updated.id,
      caseNumber: updated.caseNumber,
      status: updated.status,
      nextHearing: updated.nextHearing?.toISOString() ?? null,
    });

    return updated;
  }

  async listNotes(userId: string, caseId: string) {
    await this.profilesService.ensureProfile(userId);

    const role = await this.getRole(userId);
    const ownedCase = await this.prisma.case.findFirst({
      where: { id: caseId, userId },
      select: { id: true },
    });

    const rows = await this.prisma.caseNote.findMany({
      where: ownedCase
        ? { caseId }
        : role === 'lawyer'
          ? { caseId, lawyerId: userId }
          : { caseId, lawyerId: '__none__' },
      orderBy: { createdAt: 'desc' },
    });

    await this.auditLogService.log({
      userId,
      action: 'case.note.list',
      resource: `cases:${caseId}`,
      metadata: {
        resultCount: rows.length,
      },
    });

    return rows.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      lawyerId: item.lawyerId,
      note: item.note,
      createdAt: item.createdAt,
    }));
  }

  async addNote(userId: string, caseId: string, dto: AddCaseNoteDto) {
    await this.profilesService.ensureProfile(userId);

    const role = await this.getRole(userId);
    if (role !== 'lawyer') {
      throw new ForbiddenException('Only lawyers can add case notes');
    }

    const exists = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Case not found');
    }

    const created = await this.prisma.caseNote.create({
      data: {
        caseId,
        lawyerId: userId,
        note: dto.note,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'case.note.add',
      resource: `cases:${caseId}`,
      metadata: {
        noteId: created.id,
      },
    });

    return {
      id: created.id,
      caseId: created.caseId,
      lawyerId: created.lawyerId,
      note: created.note,
      createdAt: created.createdAt,
    };
  }
}
