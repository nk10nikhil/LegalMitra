import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PageViewDto } from './dto/page-view.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackPageView(input: PageViewDto & { userAgent?: string; ipAddress?: string }) {
    await this.prisma.auditLog.create({
      data: {
        action: 'analytics.page_view',
        resource: `web:${input.path}`,
        metadata: {
          referrer: input.referrer ?? null,
          title: input.title ?? null,
          userAgent: input.userAgent ?? null,
          ipAddress: input.ipAddress ?? null,
        },
      },
    });

    return { tracked: true };
  }
}
