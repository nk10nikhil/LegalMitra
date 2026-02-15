import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import {
  INTEGRATION_JOB_DIGILOCKER_FETCH,
  INTEGRATION_JOB_FIR_FETCH,
  INTEGRATION_JOB_LAND_RECORDS_FETCH,
  INTEGRATION_JOB_SYNC_ALL_USERS,
  INTEGRATION_JOB_SYNC_CASE,
  INTEGRATION_SYNC_QUEUE,
} from './integrations.constants';

@Injectable()
export class IntegrationsService implements OnModuleInit {
  constructor(
    @InjectQueue(INTEGRATION_SYNC_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async onModuleInit() {
    await this.queue.add(
      INTEGRATION_JOB_SYNC_ALL_USERS,
      { triggeredBy: 'scheduler' },
      {
        repeat: {
          pattern: '0 */6 * * *',
        },
        removeOnComplete: 100,
        removeOnFail: 100,
        jobId: 'sync-all-users-recurring',
      },
    );
  }

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
          INTEGRATION_JOB_SYNC_CASE,
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
      INTEGRATION_JOB_SYNC_CASE,
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

  async enqueueDigiLockerFetch(userId: string, caseId: string) {
    const row = await this.prisma.case.findFirst({ where: { id: caseId, userId } });
    if (!row) throw new NotFoundException('Case not found');

    const request = await this.prisma.integrationConnectorRequest.create({
      data: {
        userId,
        caseId: row.id,
        connector: 'digilocker',
        status: 'queued',
        requestPayload: {
          caseNumber: row.caseNumber,
          courtCode: row.courtCode,
        },
      },
    });

    const job = await this.queue.add(
      INTEGRATION_JOB_DIGILOCKER_FETCH,
      { userId, caseId: row.id, requestId: request.id },
      { attempts: 3, removeOnComplete: 100, removeOnFail: 100 },
    );

    await this.prisma.integrationConnectorRequest.update({
      where: { id: request.id },
      data: { jobId: String(job.id) },
    });

    await this.auditLogService.log({
      userId,
      action: 'integration.digilocker.enqueue',
      resource: `cases:${row.id}`,
      metadata: { requestId: request.id, jobId: String(job.id) },
    });

    return { requestId: request.id, jobId: String(job.id), status: 'queued' };
  }

  async listDigiLockerRequests(userId: string, caseId?: string) {
    const rows = await this.prisma.integrationConnectorRequest.findMany({
      where: {
        userId,
        connector: 'digilocker',
        caseId: caseId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      connector: item.connector,
      status: item.status,
      jobId: item.jobId,
      requestPayload: item.requestPayload,
      resultPayload: item.resultPayload,
      errorMessage: item.errorMessage,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async getDigiLockerRequest(userId: string, requestId: string) {
    const item = await this.prisma.integrationConnectorRequest.findFirst({
      where: { id: requestId, userId, connector: 'digilocker' },
    });
    if (!item) throw new NotFoundException('Request not found');

    return {
      id: item.id,
      caseId: item.caseId,
      connector: item.connector,
      status: item.status,
      jobId: item.jobId,
      requestPayload: item.requestPayload,
      resultPayload: item.resultPayload,
      errorMessage: item.errorMessage,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async enqueueFirFetch(userId: string, caseId: string) {
    const row = await this.prisma.case.findFirst({ where: { id: caseId, userId } });
    if (!row) throw new NotFoundException('Case not found');

    const request = await this.prisma.integrationConnectorRequest.create({
      data: {
        userId,
        caseId: row.id,
        connector: 'fir',
        status: 'queued',
        requestPayload: {
          caseNumber: row.caseNumber,
          courtCode: row.courtCode,
        },
      },
    });

    const job = await this.queue.add(
      INTEGRATION_JOB_FIR_FETCH,
      { userId, caseId: row.id, requestId: request.id },
      { attempts: 3, removeOnComplete: 100, removeOnFail: 100 },
    );

    await this.prisma.integrationConnectorRequest.update({
      where: { id: request.id },
      data: { jobId: String(job.id) },
    });

    await this.auditLogService.log({
      userId,
      action: 'integration.fir.enqueue',
      resource: `cases:${row.id}`,
      metadata: { requestId: request.id, jobId: String(job.id) },
    });

    return { requestId: request.id, jobId: String(job.id), status: 'queued' };
  }

  async listFirRequests(userId: string, caseId?: string) {
    const rows = await this.prisma.integrationConnectorRequest.findMany({
      where: {
        userId,
        connector: 'fir',
        caseId: caseId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      connector: item.connector,
      status: item.status,
      jobId: item.jobId,
      requestPayload: item.requestPayload,
      resultPayload: item.resultPayload,
      errorMessage: item.errorMessage,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async getFirRequest(userId: string, requestId: string) {
    const item = await this.prisma.integrationConnectorRequest.findFirst({
      where: { id: requestId, userId, connector: 'fir' },
    });
    if (!item) throw new NotFoundException('Request not found');

    return {
      id: item.id,
      caseId: item.caseId,
      connector: item.connector,
      status: item.status,
      jobId: item.jobId,
      requestPayload: item.requestPayload,
      resultPayload: item.resultPayload,
      errorMessage: item.errorMessage,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async enqueueLandRecordsFetch(userId: string, caseId: string) {
    const row = await this.prisma.case.findFirst({ where: { id: caseId, userId } });
    if (!row) throw new NotFoundException('Case not found');

    const request = await this.prisma.integrationConnectorRequest.create({
      data: {
        userId,
        caseId: row.id,
        connector: 'land_records',
        status: 'queued',
        requestPayload: {
          caseNumber: row.caseNumber,
          courtCode: row.courtCode,
        },
      },
    });

    const job = await this.queue.add(
      INTEGRATION_JOB_LAND_RECORDS_FETCH,
      { userId, caseId: row.id, requestId: request.id },
      { attempts: 3, removeOnComplete: 100, removeOnFail: 100 },
    );

    await this.prisma.integrationConnectorRequest.update({
      where: { id: request.id },
      data: { jobId: String(job.id) },
    });

    await this.auditLogService.log({
      userId,
      action: 'integration.land_records.enqueue',
      resource: `cases:${row.id}`,
      metadata: { requestId: request.id, jobId: String(job.id) },
    });

    return { requestId: request.id, jobId: String(job.id), status: 'queued' };
  }

  async listLandRecordsRequests(userId: string, caseId?: string) {
    const rows = await this.prisma.integrationConnectorRequest.findMany({
      where: {
        userId,
        connector: 'land_records',
        caseId: caseId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      connector: item.connector,
      status: item.status,
      jobId: item.jobId,
      requestPayload: item.requestPayload,
      resultPayload: item.resultPayload,
      errorMessage: item.errorMessage,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async getLandRecordsRequest(userId: string, requestId: string) {
    const item = await this.prisma.integrationConnectorRequest.findFirst({
      where: { id: requestId, userId, connector: 'land_records' },
    });
    if (!item) throw new NotFoundException('Request not found');

    return {
      id: item.id,
      caseId: item.caseId,
      connector: item.connector,
      status: item.status,
      jobId: item.jobId,
      requestPayload: item.requestPayload,
      resultPayload: item.resultPayload,
      errorMessage: item.errorMessage,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
