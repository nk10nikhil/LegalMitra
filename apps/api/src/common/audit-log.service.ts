import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    action: string;
    resource: string;
    metadata?: Record<string, unknown>;
  }) {
    const metadata = params.metadata ?? {};
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (this.isForeignKeyError(error)) {
        try {
          await this.prisma.auditLog.create({
            data: {
              userId: null,
              action: params.action,
              resource: params.resource,
              metadata: {
                ...metadata,
                actorUserId: params.userId ?? null,
              } as Prisma.InputJsonValue,
            },
          });
          return;
        } catch (retryError) {
          this.logger.warn('Audit log fallback write skipped.');
          this.logger.warn(retryError instanceof Error ? retryError.message : 'Unknown audit log fallback error');
          return;
        }
      }
      this.logger.warn('Audit log write skipped (database unavailable or migration pending).');
      this.logger.warn(error instanceof Error ? error.message : 'Unknown audit log error');
    }
  }

  private isForeignKeyError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
  }
}
