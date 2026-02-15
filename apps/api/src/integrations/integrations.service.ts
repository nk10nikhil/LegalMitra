import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { INTEGRATION_SYNC_QUEUE } from './integrations.constants';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectQueue(INTEGRATION_SYNC_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async enqueueUserCaseSync(userId: string) {
    const cases = await this.prisma.case.findMany({
      where: { userId },
      select: { id: true },
    });

    if (!cases.length) {
      return { enqueued: 0, jobs: [] as string[] };
    }

    const jobs = await Promise.all(
      cases.map((item) =>
        this.queue.add(
          'sync-case',
          { userId, caseId: item.id },
          { attempts: 3, removeOnComplete: 100, removeOnFail: 100 },
        ),
      ),
    );

    await this.auditLogService.log({
      userId,
      action: 'integration.sync_all.enqueue',
      resource: 'integrations:sync',
      metadata: { count: jobs.length },
    });

    return {
      enqueued: jobs.length,
      jobs: jobs.map((job) => String(job.id)),
    };
  }

  async enqueueSingleCaseSync(userId: string, caseId: string) {
    const row = await this.prisma.case.findFirst({ where: { id: caseId, userId } });
    if (!row) throw new NotFoundException('Case not found');

    const job = await this.queue.add(
      'sync-case',
      { userId, caseId: row.id },
      { attempts: 3, removeOnComplete: 100, removeOnFail: 100 },
    );

    await this.auditLogService.log({
      userId,
      action: 'integration.sync_case.enqueue',
      resource: `cases:${row.id}`,
    });

    return { jobId: String(job.id) };
  }

  async getJobStatus(userId: string, jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');

    const state = await job.getState();
    const data = job.data as { userId?: string };

    if (data.userId && data.userId !== userId) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: String(job.id),
      state,
      progress: job.progress,
      failedReason: job.failedReason ?? null,
      returnValue: job.returnvalue ?? null,
    };
  }
}
