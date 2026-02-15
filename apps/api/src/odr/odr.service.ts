import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';
import { AiService } from '../ai/ai.service';
import { AuditLogService } from '../common/audit-log.service';
import { ProfilesService } from '../profiles/profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOdrRoomDto } from './dto/create-odr-room.dto';
import { SendOdrMessageDto } from './dto/send-odr-message.dto';
import { SettlementOdrDto } from './dto/settlement-odr.dto';

@Injectable()
export class OdrService {
  private readonly storageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'legal-documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly auditLogService: AuditLogService,
    private readonly aiService: AiService,
  ) {}

  private inferActsCitedCount(input: unknown): number {
    if (!input || typeof input !== 'object') return 0;
    const data = input as Record<string, unknown>;

    const actsCandidates = [data.acts, data.actsCited, data.acts_cited, data.statutes];
    for (const candidate of actsCandidates) {
      if (Array.isArray(candidate)) {
        return Math.max(0, Math.min(100, candidate.length));
      }
    }

    return 0;
  }

  private getStorageClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return null;
    return createClient(supabaseUrl, serviceRoleKey);
  }

  private buildSettlementPdfBuffer(payload: {
    roomTitle: string;
    counterpartyEmail: string;
    terms: string;
    aiMediatorSuggestion: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('ODR Settlement Agreement (Draft)', { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(`Generated: ${new Date().toLocaleString()}`);
      doc.fontSize(11).text(`Dispute Room: ${payload.roomTitle}`);
      doc.fontSize(11).text(`Counterparty: ${payload.counterpartyEmail}`);
      doc.moveDown();
      doc.fontSize(13).text('Proposed Terms');
      doc.moveDown(0.5);
      doc.fontSize(11).text(payload.terms, { lineGap: 2 });
      doc.moveDown();
      doc.fontSize(13).text('AI Mediator Suggestion');
      doc.moveDown(0.5);
      doc.fontSize(11).text(payload.aiMediatorSuggestion, { lineGap: 2 });
      doc.moveDown();
      doc
        .fontSize(10)
        .text(
          'This document is system-generated for assisted settlement workflow and should be reviewed before legal execution.',
        );

      doc.end();
    });
  }

  private async toSettlementResponse(row: {
    id: string;
    terms: string;
    aiMediatorSuggestion: string | null;
    status: string;
    decidedAt: Date | null;
    createdAt: Date;
    documentId: string | null;
    document?: { fileUrl: string } | null;
  }) {
    let downloadUrl: string | null = null;

    const fileUrl = row.document?.fileUrl ?? null;
    if (fileUrl?.startsWith('supabase://')) {
      const storageClient = this.getStorageClient();
      if (storageClient) {
        const storagePath = fileUrl.replace(`supabase://${this.storageBucket}/`, '');
        const expirySeconds = Number(
          process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS ?? 60 * 60 * 24 * 7,
        );
        const { data } = await storageClient.storage
          .from(this.storageBucket)
          .createSignedUrl(storagePath, expirySeconds);
        downloadUrl = data?.signedUrl ?? null;
      }
    }

    return {
      id: row.id,
      terms: row.terms,
      aiMediatorSuggestion: row.aiMediatorSuggestion,
      status: row.status,
      decidedAt: row.decidedAt,
      createdAt: row.createdAt,
      documentId: row.documentId,
      documentUrl: fileUrl,
      downloadUrl,
    };
  }

  private async ensureRoomOwnership(userId: string, roomId: string) {
    const room = await this.prisma.odrRoom.findFirst({
      where: {
        id: roomId,
        ownerUserId: userId,
      },
    });

    if (!room) {
      throw new NotFoundException('ODR room not found');
    }

    return room;
  }

  async createRoom(userId: string, dto: CreateOdrRoomDto) {
    await this.profilesService.ensureProfile(userId);

    const room = await this.prisma.odrRoom.create({
      data: {
        ownerUserId: userId,
        title: dto.title,
        counterpartyEmail: dto.counterpartyEmail,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'odr.room.create',
      resource: `odr:${room.id}`,
    });

    return room;
  }

  async listRooms(userId: string) {
    await this.profilesService.ensureProfile(userId);
    return this.prisma.odrRoom.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMessages(userId: string, roomId: string) {
    await this.ensureRoomOwnership(userId, roomId);
    return this.prisma.odrMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(userId: string, roomId: string, dto: SendOdrMessageDto) {
    await this.ensureRoomOwnership(userId, roomId);

    const row = await this.prisma.odrMessage.create({
      data: {
        roomId,
        senderUserId: userId,
        message: dto.message,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'odr.message.send',
      resource: `odr:${roomId}`,
    });

    return row;
  }

  async getRoomPrediction(userId: string, roomId: string) {
    await this.ensureRoomOwnership(userId, roomId);

    const [messageCount, userCases] = await Promise.all([
      this.prisma.odrMessage.count({ where: { roomId } }),
      this.prisma.case.findMany({
        where: { userId },
        select: { id: true, courtCode: true, caseData: true, lastSynced: true },
        orderBy: { lastSynced: 'desc' },
        take: 10,
      }),
    ]);

    const latestCase = userCases[0] ?? null;
    const caseIds = userCases.map((item) => item.id);
    const priorHearings = caseIds.length
      ? await this.prisma.hearing.count({ where: { caseId: { in: caseIds } } })
      : 0;

    const actsCitedBase = latestCase ? this.inferActsCitedCount(latestCase.caseData) : 0;
    const actsCitedCount = Math.min(
      100,
      Math.max(0, actsCitedBase || Math.floor(messageCount / 3)),
    );

    const predictionPayload = {
      court: latestCase?.courtCode ?? 'District Court',
      year: new Date().getFullYear(),
      petitioner_type: 'individual',
      respondent_type: 'individual',
      acts_cited_count: actsCitedCount,
      prior_hearings: Math.max(0, Math.min(500, priorHearings)),
    };

    try {
      const prediction = await this.aiService.predict(userId, predictionPayload);

      await this.auditLogService.log({
        userId,
        action: 'odr.prediction.fetch',
        resource: `odr:${roomId}`,
        metadata: {
          successProbability: prediction.success_probability,
          model: prediction.model,
          messageCount,
        },
      });

      return {
        roomId,
        prediction: {
          successProbability: prediction.success_probability,
          similarCases: prediction.similar_cases,
          model: prediction.model,
          disclaimer: prediction.disclaimer,
        },
        context: {
          messageCount,
          court: predictionPayload.court,
          year: predictionPayload.year,
          actsCitedCount: predictionPayload.acts_cited_count,
          priorHearings: predictionPayload.prior_hearings,
        },
      };
    } catch {
      const fallbackScore = Math.max(0.2, Math.min(0.85, 0.45 + messageCount * 0.01));
      return {
        roomId,
        prediction: {
          successProbability: fallbackScore,
          similarCases: Math.max(1, Math.min(50, messageCount + 3)),
          model: 'odr-fallback-heuristic-v1',
          disclaimer: 'Fallback estimate. AI service unavailable.',
        },
        context: {
          messageCount,
          court: predictionPayload.court,
          year: predictionPayload.year,
          actsCitedCount: predictionPayload.acts_cited_count,
          priorHearings: predictionPayload.prior_hearings,
        },
      };
    }
  }

  async proposeSettlement(userId: string, roomId: string, dto: SettlementOdrDto) {
    const room = await this.ensureRoomOwnership(userId, roomId);
    const prediction = await this.getRoomPrediction(userId, roomId);
    const percent = Math.round(prediction.prediction.successProbability * 100);
    const similarCaseHint =
      `Prediction context indicates approximately ${percent}% favorable likelihood with ` +
      `${prediction.prediction.similarCases} similar cases. Early settlement may reduce dispute timeline.`;

    const created = await this.prisma.odrSettlementAgreement.create({
      data: {
        roomId,
        proposerUserId: userId,
        terms: dto.terms,
        aiMediatorSuggestion: similarCaseHint,
        status: 'pending',
      },
    });

    const pdfBuffer = await this.buildSettlementPdfBuffer({
      roomTitle: room.title,
      counterpartyEmail: room.counterpartyEmail,
      terms: dto.terms,
      aiMediatorSuggestion: similarCaseHint,
    });

    const storageClient = this.getStorageClient();
    const fileName = `odr-settlement-${created.id}.pdf`;
    const storagePath = `${userId}/odr/${roomId}/${fileName}`;
    let fileUrl = `inline://${fileName}`;

    if (storageClient) {
      const { error } = await storageClient.storage
        .from(this.storageBucket)
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (!error) {
        fileUrl = `supabase://${this.storageBucket}/${storagePath}`;
      }
    }

    const document = await this.prisma.document.create({
      data: {
        userId,
        type: 'odr_settlement_agreement',
        title: `ODR Settlement Agreement - ${room.title}`,
        fileUrl,
        formData: {
          roomId,
          settlementId: created.id,
          counterpartyEmail: room.counterpartyEmail,
          status: 'pending',
        },
      },
    });

    const updatedSettlement = await this.prisma.odrSettlementAgreement.update({
      where: { id: created.id },
      data: { documentId: document.id },
      include: { document: { select: { fileUrl: true } } },
    });

    await this.auditLogService.log({
      userId,
      action: 'odr.settlement.propose',
      resource: `odr:${roomId}`,
      metadata: {
        termsLength: dto.terms.length,
        settlementId: created.id,
        predictionModel: prediction.prediction.model,
        predictionSuccessProbability: prediction.prediction.successProbability,
      },
    });

    return this.toSettlementResponse(updatedSettlement);
  }

  async listSettlements(userId: string, roomId: string) {
    await this.ensureRoomOwnership(userId, roomId);

    const rows = await this.prisma.odrSettlementAgreement.findMany({
      where: { roomId },
      include: { document: { select: { fileUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(rows.map((row) => this.toSettlementResponse(row)));
  }

  async decideSettlement(
    userId: string,
    roomId: string,
    settlementId: string,
    decision: 'accepted' | 'rejected',
  ) {
    await this.ensureRoomOwnership(userId, roomId);

    const row = await this.prisma.odrSettlementAgreement.findFirst({
      where: { id: settlementId, roomId },
      include: {
        document: { select: { id: true, fileUrl: true, formData: true } },
      },
    });

    if (!row) throw new NotFoundException('Settlement agreement not found');
    if (row.status !== 'pending') {
      throw new BadRequestException('Settlement agreement already decided');
    }

    const decidedAt = new Date();
    const updated = await this.prisma.odrSettlementAgreement.update({
      where: { id: row.id },
      data: {
        status: decision,
        decidedAt,
      },
      include: { document: { select: { id: true, fileUrl: true, formData: true } } },
    });

    if (row.document?.id) {
      await this.prisma.document.update({
        where: { id: row.document.id },
        data: {
          formData: {
            ...(typeof row.document.formData === 'object' && row.document.formData
              ? row.document.formData
              : {}),
            status: decision,
            decidedAt: decidedAt.toISOString(),
          },
        },
      });
    }

    await this.auditLogService.log({
      userId,
      action: `odr.settlement.${decision}`,
      resource: `odr:${roomId}`,
      metadata: {
        settlementId: row.id,
      },
    });

    return this.toSettlementResponse(updated);
  }
}
