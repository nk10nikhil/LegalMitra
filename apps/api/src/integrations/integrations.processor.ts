import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ECourtsService } from '../cases/ecourts.service';
import { AuditLogService } from '../common/audit-log.service';
import { RealtimeService } from '../realtime/realtime.service';
import {
  INTEGRATION_JOB_DIGILOCKER_FETCH,
  INTEGRATION_JOB_FIR_FETCH,
  INTEGRATION_JOB_LAND_RECORDS_FETCH,
  INTEGRATION_JOB_SYNC_ALL_USERS,
  INTEGRATION_SYNC_QUEUE,
} from './integrations.constants';

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
    if (job.name === INTEGRATION_JOB_SYNC_ALL_USERS) {
      const cases = await this.prisma.case.findMany({
        select: { id: true, userId: true, caseNumber: true, courtCode: true },
        take: 200,
      });

      let changedCount = 0;
      for (const row of cases) {
        const fetched = await this.ecourtsService.fetchCaseFromECourts({
          caseNumber: row.caseNumber,
          courtCode: row.courtCode,
        });

        const previousNextHearing =
          (
            await this.prisma.case.findUnique({
              where: { id: row.id },
              select: { nextHearing: true },
            })
          )?.nextHearing?.toISOString() ?? null;

        const updated = await this.prisma.case.update({
          where: { id: row.id },
          data: {
            status: fetched.status,
            caseData: fetched.raw as any,
            nextHearing: fetched.nextHearing,
            lastSynced: new Date(),
          },
        });

        const nextHearingChanged =
          previousNextHearing !== (updated.nextHearing?.toISOString() ?? null);
        if (nextHearingChanged) {
          changedCount += 1;
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

          this.realtimeService.emitToUser(updated.userId, 'case.synced', {
            caseId: updated.id,
            status: updated.status,
            nextHearing: updated.nextHearing?.toISOString() ?? null,
            nextHearingChanged,
          });
        }
      }

      await this.auditLogService.log({
        action: 'integration.sync_all_users.processed',
        resource: 'integrations:sync',
        metadata: {
          caseCount: cases.length,
          changedCount,
        },
      });

      return {
        caseCount: cases.length,
        changedCount,
      };
    }

    if (job.name === INTEGRATION_JOB_DIGILOCKER_FETCH) {
      return this.processDigiLockerFetch(
        job as Job<{ userId: string; caseId: string; requestId: string }>,
      );
    }

    if (job.name === INTEGRATION_JOB_FIR_FETCH) {
      return this.processFirFetch(
        job as Job<{ userId: string; caseId: string; requestId: string }>,
      );
    }

    if (job.name === INTEGRATION_JOB_LAND_RECORDS_FETCH) {
      return this.processLandRecordsFetch(
        job as Job<{ userId: string; caseId: string; requestId: string }>,
      );
    }

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

  private async processDigiLockerFetch(
    job: Job<{ userId: string; caseId: string; requestId: string }>,
  ) {
    const request = await this.prisma.integrationConnectorRequest.findUnique({
      where: { id: job.data.requestId },
    });

    if (!request || request.userId !== job.data.userId) {
      return { skipped: true, reason: 'request_not_found' };
    }

    if (request.status === 'completed') {
      return {
        skipped: true,
        reason: 'already_completed',
        resultPayload: request.resultPayload,
      };
    }

    await this.prisma.integrationConnectorRequest.update({
      where: { id: request.id },
      data: { status: 'processing', errorMessage: null },
    });

    try {
      const row = await this.prisma.case.findFirst({
        where: { id: job.data.caseId, userId: job.data.userId },
      });
      if (!row) throw new Error('case_not_found');

      const generatedAt = new Date().toISOString();
      const records = [
        {
          userId: row.userId,
          caseId: row.id,
          type: 'digilocker_record',
          title: `DigiLocker filing summary ${row.caseNumber}`,
          fileUrl: `digilocker://records/${request.id}/filing-summary`,
          formData: {
            connectorRequestId: request.id,
            connector: 'digilocker',
            generatedAt,
            category: 'filing_summary',
            caseNumber: row.caseNumber,
            courtCode: row.courtCode,
          },
        },
        {
          userId: row.userId,
          caseId: row.id,
          type: 'digilocker_record',
          title: `DigiLocker hearing metadata ${row.caseNumber}`,
          fileUrl: `digilocker://records/${request.id}/hearing-metadata`,
          formData: {
            connectorRequestId: request.id,
            connector: 'digilocker',
            generatedAt,
            category: 'hearing_metadata',
            caseNumber: row.caseNumber,
            nextHearing: row.nextHearing?.toISOString() ?? null,
          },
        },
      ];

      await this.prisma.document.createMany({ data: records as any[] });

      const resultPayload = {
        recordsImported: records.length,
        caseId: row.id,
        caseNumber: row.caseNumber,
        source: 'digilocker-simulated',
      };

      await this.prisma.integrationConnectorRequest.update({
        where: { id: request.id },
        data: {
          status: 'completed',
          resultPayload: resultPayload as any,
          completedAt: new Date(),
        },
      });

      await this.auditLogService.log({
        userId: job.data.userId,
        action: 'integration.digilocker.processed',
        resource: `cases:${row.id}`,
        metadata: { requestId: request.id, recordsImported: records.length },
      });

      this.realtimeService.emitToUser(job.data.userId, 'integration.connector.completed', {
        requestId: request.id,
        connector: 'digilocker',
        caseId: row.id,
      });

      return resultPayload;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';

      await this.prisma.integrationConnectorRequest.update({
        where: { id: request.id },
        data: {
          status: 'failed',
          errorMessage: reason,
          completedAt: new Date(),
        },
      });

      await this.auditLogService.log({
        userId: job.data.userId,
        action: 'integration.digilocker.failed',
        resource: `cases:${job.data.caseId}`,
        metadata: { requestId: request.id, reason },
      });

      this.realtimeService.emitToUser(job.data.userId, 'integration.connector.failed', {
        requestId: request.id,
        connector: 'digilocker',
        caseId: job.data.caseId,
        reason,
      });

      throw error;
    }
  }

  private async processFirFetch(job: Job<{ userId: string; caseId: string; requestId: string }>) {
    const request = await this.prisma.integrationConnectorRequest.findUnique({
      where: { id: job.data.requestId },
    });

    if (!request || request.userId !== job.data.userId) {
      return { skipped: true, reason: 'request_not_found' };
    }

    if (request.status === 'completed') {
      return {
        skipped: true,
        reason: 'already_completed',
        resultPayload: request.resultPayload,
      };
    }

    await this.prisma.integrationConnectorRequest.update({
      where: { id: request.id },
      data: { status: 'processing', errorMessage: null },
    });

    try {
      const row = await this.prisma.case.findFirst({
        where: { id: job.data.caseId, userId: job.data.userId },
      });
      if (!row) throw new Error('case_not_found');

      const generatedAt = new Date().toISOString();
      const records = [
        {
          userId: row.userId,
          caseId: row.id,
          type: 'fir_record',
          title: `FIR registry match ${row.caseNumber}`,
          fileUrl: `fir://records/${request.id}/registry-match`,
          formData: {
            connectorRequestId: request.id,
            connector: 'fir',
            generatedAt,
            category: 'registry_match',
            caseNumber: row.caseNumber,
            courtCode: row.courtCode,
          },
        },
        {
          userId: row.userId,
          caseId: row.id,
          type: 'fir_record',
          title: `FIR station summary ${row.caseNumber}`,
          fileUrl: `fir://records/${request.id}/station-summary`,
          formData: {
            connectorRequestId: request.id,
            connector: 'fir',
            generatedAt,
            category: 'station_summary',
            caseNumber: row.caseNumber,
            district: 'sample-district',
          },
        },
      ];

      await this.prisma.document.createMany({ data: records as any[] });

      const resultPayload = {
        recordsImported: records.length,
        caseId: row.id,
        caseNumber: row.caseNumber,
        source: 'fir-simulated',
      };

      await this.prisma.integrationConnectorRequest.update({
        where: { id: request.id },
        data: {
          status: 'completed',
          resultPayload: resultPayload as any,
          completedAt: new Date(),
        },
      });

      await this.auditLogService.log({
        userId: job.data.userId,
        action: 'integration.fir.processed',
        resource: `cases:${row.id}`,
        metadata: { requestId: request.id, recordsImported: records.length },
      });

      this.realtimeService.emitToUser(job.data.userId, 'integration.connector.completed', {
        requestId: request.id,
        connector: 'fir',
        caseId: row.id,
      });

      return resultPayload;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';

      await this.prisma.integrationConnectorRequest.update({
        where: { id: request.id },
        data: {
          status: 'failed',
          errorMessage: reason,
          completedAt: new Date(),
        },
      });

      await this.auditLogService.log({
        userId: job.data.userId,
        action: 'integration.fir.failed',
        resource: `cases:${job.data.caseId}`,
        metadata: { requestId: request.id, reason },
      });

      this.realtimeService.emitToUser(job.data.userId, 'integration.connector.failed', {
        requestId: request.id,
        connector: 'fir',
        caseId: job.data.caseId,
        reason,
      });

      throw error;
    }
  }

  private async processLandRecordsFetch(
    job: Job<{ userId: string; caseId: string; requestId: string }>,
  ) {
    const request = await this.prisma.integrationConnectorRequest.findUnique({
      where: { id: job.data.requestId },
    });

    if (!request || request.userId !== job.data.userId) {
      return { skipped: true, reason: 'request_not_found' };
    }

    if (request.status === 'completed') {
      return {
        skipped: true,
        reason: 'already_completed',
        resultPayload: request.resultPayload,
      };
    }

    await this.prisma.integrationConnectorRequest.update({
      where: { id: request.id },
      data: { status: 'processing', errorMessage: null },
    });

    try {
      const row = await this.prisma.case.findFirst({
        where: { id: job.data.caseId, userId: job.data.userId },
      });
      if (!row) throw new Error('case_not_found');

      const generatedAt = new Date().toISOString();
      const records = [
        {
          userId: row.userId,
          caseId: row.id,
          type: 'land_record',
          title: `Land parcel extract ${row.caseNumber}`,
          fileUrl: `land-records://records/${request.id}/parcel-extract`,
          formData: {
            connectorRequestId: request.id,
            connector: 'land_records',
            generatedAt,
            category: 'parcel_extract',
            caseNumber: row.caseNumber,
            courtCode: row.courtCode,
          },
        },
        {
          userId: row.userId,
          caseId: row.id,
          type: 'land_record',
          title: `Mutation status note ${row.caseNumber}`,
          fileUrl: `land-records://records/${request.id}/mutation-status`,
          formData: {
            connectorRequestId: request.id,
            connector: 'land_records',
            generatedAt,
            category: 'mutation_status',
            caseNumber: row.caseNumber,
            district: 'sample-district',
          },
        },
      ];

      await this.prisma.document.createMany({ data: records as any[] });

      const resultPayload = {
        recordsImported: records.length,
        caseId: row.id,
        caseNumber: row.caseNumber,
        source: 'land-records-simulated',
      };

      await this.prisma.integrationConnectorRequest.update({
        where: { id: request.id },
        data: {
          status: 'completed',
          resultPayload: resultPayload as any,
          completedAt: new Date(),
        },
      });

      await this.auditLogService.log({
        userId: job.data.userId,
        action: 'integration.land_records.processed',
        resource: `cases:${row.id}`,
        metadata: { requestId: request.id, recordsImported: records.length },
      });

      this.realtimeService.emitToUser(job.data.userId, 'integration.connector.completed', {
        requestId: request.id,
        connector: 'land_records',
        caseId: row.id,
      });

      return resultPayload;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';

      await this.prisma.integrationConnectorRequest.update({
        where: { id: request.id },
        data: {
          status: 'failed',
          errorMessage: reason,
          completedAt: new Date(),
        },
      });

      await this.auditLogService.log({
        userId: job.data.userId,
        action: 'integration.land_records.failed',
        resource: `cases:${job.data.caseId}`,
        metadata: { requestId: request.id, reason },
      });

      this.realtimeService.emitToUser(job.data.userId, 'integration.connector.failed', {
        requestId: request.id,
        connector: 'land_records',
        caseId: job.data.caseId,
        reason,
      });

      throw error;
    }
  }
}
