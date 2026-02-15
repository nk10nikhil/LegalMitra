import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async ensureAdmin(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!profile || profile.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }

  async metrics(userId: string) {
    await this.ensureAdmin(userId);

    const [
      profilesCount,
      casesCount,
      documentsCount,
      hearingsCount,
      notificationsCount,
      unreadNotificationsCount,
      auditLogsCount,
      profiles,
      recentAudit,
    ] = await this.prisma.$transaction([
      this.prisma.profile.count(),
      this.prisma.case.count(),
      this.prisma.document.count(),
      this.prisma.hearing.count(),
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { read: false } }),
      this.prisma.auditLog.count(),
      this.prisma.profile.findMany({
        select: { role: true },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          resource: true,
          createdAt: true,
        },
      }),
    ]);

    await this.auditLogService.log({
      userId,
      action: 'admin.metrics.view',
      resource: 'admin:metrics',
      metadata: {
        recentAuditSize: recentAudit.length,
      },
    });

    const roleMap = new Map<string, number>();
    for (const profile of profiles) {
      roleMap.set(profile.role, (roleMap.get(profile.role) ?? 0) + 1);
    }

    return {
      totals: {
        users: profilesCount,
        cases: casesCount,
        documents: documentsCount,
        hearings: hearingsCount,
        notifications: notificationsCount,
        unreadNotifications: unreadNotificationsCount,
        auditLogs: auditLogsCount,
      },
      roleBreakdown: Array.from(roleMap.entries()).map(([role, count]) => ({ role, count })),
      recentAudit,
    };
  }

  async listUsers(userId: string, query: ListAdminUsersDto) {
    await this.ensureAdmin(userId);

    const rows = await this.prisma.profile.findMany({
      where: {
        role: query.role,
        verified: query.verified,
        OR: query.q
          ? [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 100,
    });

    await this.auditLogService.log({
      userId,
      action: 'admin.users.list',
      resource: 'admin:users',
      metadata: {
        hasQuery: Boolean(query.q),
        role: query.role ?? null,
        verified: query.verified ?? null,
        count: rows.length,
      },
    });

    return rows.map((item) => ({
      id: item.id,
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      role: item.role,
      verified: item.verified,
      createdAt: item.createdAt,
    }));
  }

  async updateUser(adminUserId: string, targetUserId: string, payload: UpdateAdminUserDto) {
    await this.ensureAdmin(adminUserId);

    if (payload.role === undefined && payload.verified === undefined) {
      throw new BadRequestException('At least one field is required');
    }

    const existing = await this.prisma.profile.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, verified: true },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (targetUserId === adminUserId && payload.role && payload.role !== 'admin') {
      throw new BadRequestException('Admin cannot remove own admin role');
    }

    const updated = await this.prisma.profile.update({
      where: { id: targetUserId },
      data: {
        role: payload.role,
        verified: payload.verified,
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: updated.id,
        type: 'admin_profile_updated',
        content: {
          role: updated.role,
          verified: updated.verified,
        },
      },
    });

    await this.auditLogService.log({
      userId: adminUserId,
      action: 'admin.users.update',
      resource: `profiles:${updated.id}`,
      metadata: {
        beforeRole: existing.role,
        afterRole: updated.role,
        beforeVerified: existing.verified,
        afterVerified: updated.verified,
      },
    });

    return {
      id: updated.id,
      role: updated.role,
      verified: updated.verified,
    };
  }
}
