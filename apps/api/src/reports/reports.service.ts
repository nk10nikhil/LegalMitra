import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { AuditLogService } from '../common/audit-log.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async myReport(userId: string) {
    await this.profilesService.ensureProfile(userId);

    const [cases, documents, notifications, profile, notes] = await this.prisma.$transaction([
      this.prisma.case.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          caseNumber: true,
          courtCode: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          title: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          read: true,
          createdAt: true,
        },
      }),
      this.prisma.profile.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      this.prisma.caseNote.findMany({
        where: { lawyerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          caseId: true,
          createdAt: true,
        },
      }),
    ]);

    const caseIds = cases.map((item) => item.id);
    const hearings = caseIds.length
      ? await this.prisma.hearing.findMany({
          where: {
            caseId: {
              in: caseIds,
            },
          },
          orderBy: { scheduledAt: 'desc' },
          take: 10,
          select: {
            id: true,
            caseId: true,
            status: true,
            scheduledAt: true,
          },
        })
      : [];

    await this.auditLogService.log({
      userId,
      action: 'report.export.view',
      resource: 'reports:me',
      metadata: {
        role: profile?.role ?? null,
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      role: profile?.role ?? 'citizen',
      totals: {
        cases: cases.length,
        documents: documents.length,
        notifications: notifications.length,
        unreadNotifications: notifications.filter((item) => !item.read).length,
        hearings: hearings.length,
        lawyerNotes: notes.length,
      },
      cases,
      documents,
      notifications,
      hearings,
      notes,
    };
  }
}
