import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
  ) {}

  async list(userId: string, query: ListAuditLogsDto) {
    await this.profilesService.ensureProfile(userId);

    const rows = await this.prisma.auditLog.findMany({
      where: {
        userId,
        action: query.action
          ? {
              contains: query.action,
              mode: 'insensitive',
            }
          : undefined,
        resource: query.resource
          ? {
              contains: query.resource,
              mode: 'insensitive',
            }
          : undefined,
      },
      orderBy: {
        createdAt: query.sort === 'asc' ? 'asc' : 'desc',
      },
      take: query.limit ?? 50,
    });

    return rows.map((item) => ({
      id: item.id,
      userId: item.userId,
      action: item.action,
      resource: item.resource,
      metadata: item.metadata,
      createdAt: item.createdAt,
    }));
  }
}
