import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { AuditLogService } from '../common/audit-log.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly auditLogService: AuditLogService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async list(userId: string) {
    await this.profilesService.ensureProfile(userId);

    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return rows.map((item) => ({
      id: item.id,
      type: item.type,
      content: item.content,
      read: item.read,
      createdAt: item.createdAt,
    }));
  }

  async markRead(userId: string, id: string) {
    await this.profilesService.ensureProfile(userId);

    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    await this.auditLogService.log({
      userId,
      action: 'notification.read',
      resource: `notifications:${id}`,
    });

    this.realtimeService.emitToUser(userId, 'notification.read', {
      notificationId: id,
    });

    return {
      id: updated.id,
      read: updated.read,
    };
  }

  async markAllRead(userId: string) {
    await this.profilesService.ensureProfile(userId);

    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    await this.auditLogService.log({
      userId,
      action: 'notification.read_all',
      resource: 'notifications',
      metadata: {
        updatedCount: result.count,
      },
    });

    this.realtimeService.emitToUser(userId, 'notification.read_all', {
      updatedCount: result.count,
    });

    return {
      updatedCount: result.count,
    };
  }

  async upcomingHearingReminders(userId: string, days = 7) {
    await this.profilesService.ensureProfile(userId);

    const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 30) : 7;
    const now = new Date();
    const to = new Date(now.getTime() + safeDays * 24 * 60 * 60 * 1000);

    const cases = await this.prisma.case.findMany({
      where: { userId },
      select: { id: true, caseNumber: true, courtCode: true },
    });

    if (!cases.length) return [];

    const caseMap = new Map(cases.map((item) => [item.id, item]));

    const hearings = await this.prisma.hearing.findMany({
      where: {
        caseId: { in: cases.map((item) => item.id) },
        status: 'scheduled',
        scheduledAt: {
          gte: now,
          lte: to,
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    });

    await this.auditLogService.log({
      userId,
      action: 'notification.reminders.view',
      resource: 'notifications:reminders',
      metadata: {
        days: safeDays,
        count: hearings.length,
      },
    });

    this.realtimeService.emitToUser(userId, 'notification.reminders_checked', {
      days: safeDays,
      count: hearings.length,
    });

    return hearings.map((hearing) => ({
      hearingId: hearing.id,
      caseId: hearing.caseId,
      caseNumber: caseMap.get(hearing.caseId)?.caseNumber ?? null,
      courtCode: caseMap.get(hearing.caseId)?.courtCode ?? null,
      scheduledAt: hearing.scheduledAt,
      roomUrl: hearing.roomUrl,
      status: hearing.status,
    }));
  }
}
