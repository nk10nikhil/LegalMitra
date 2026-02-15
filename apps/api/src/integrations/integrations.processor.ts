import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ECourtsService } from '../cases/ecourts.service';
import { AuditLogService } from '../common/audit-log.service';
import { RealtimeService } from '../realtime/realtime.service';
import { INTEGRATION_SYNC_QUEUE } from './integrations.constants';

@Processor(INTEGRATION_SYNC_QUEUE)
export class IntegrationsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ecourtsService: ECourtsService,
    private readonly auditLogService: AuditLogService,
    private readonly realtimeService: RealtimeService,
  ) {
    super();
  }

  async process(job: Job<{ userId: string; caseId: string }>) {
    const row = await this.prisma.case.findUnique({ where: { id: job.data.caseId } });
    if (!row) return { skipped: true, reason: 'case_not_found' };

    const fetched = await this.ecourtsService.fetchCaseFromECourts({
      caseNumber: row.caseNumber,
      courtCode: row.courtCode,
    });

    const previousNextHearing = row.nextHearing?.toISOString() ?? null;
    const updated = await this.prisma.case.update({
      where: { id: row.id },
      data: {
        status: fetched.status,
        caseData: fetched.raw as any,
        nextHearing: fetched.nextHearing,
        lastSynced: new Date(),
      },
    });

    const nextHearingChanged = previousNextHearing !== (updated.nextHearing?.toISOString() ?? null);

    if (nextHearingChanged) {
      await this.prisma.notification.create({
        data: {
          userId: updated.userId,
          type: 'case_next_hearing_changed',
          content: {
            caseId: updated.id,
            caseNumber: updated.caseNumber,
            previousNextHearing,
            nextHearing: updated.nextHearing?.toISOString() ?? null,
          },
        },
      });
    }

    await this.auditLogService.log({
      userId: job.data.userId,
      action: 'integration.sync_case.processed',
      resource: `cases:${updated.id}`,
      metadata: {
        nextHearingChanged,
        status: updated.status,
      },
    });

    this.realtimeService.emitToUser(updated.userId, 'case.synced', {
      caseId: updated.id,
      status: updated.status,
      nextHearing: updated.nextHearing?.toISOString() ?? null,
      nextHearingChanged,
    });

    return {
      caseId: updated.id,
      nextHearingChanged,
      status: updated.status,
    };
  }
}
