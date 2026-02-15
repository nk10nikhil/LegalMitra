import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import FormData from 'form-data';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { ProfilesService } from '../profiles/profiles.service';
import { DocumentType, GenerateDocumentDto } from './dto/generate-document.dto';
import { SummarizeDocumentDto } from './dto/summarize-document.dto';
import { renderDocumentText, validateTemplateInput } from './documents.templates';

type GeneratedDocumentResult = {
  id: string;
  type: string;
  title: string;
  fileUrl: string;
  downloadUrl: string | null;
  createdAt: Date;
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly storageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'legal-documents';
  private readonly aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private getStorageClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return null;
    }
    return createClient(supabaseUrl, serviceRoleKey);
  }

  private buildPdfBuffer(payload: { title: string; bodyText: string }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(payload.title, { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(payload.bodyText, {
        align: 'left',
        lineGap: 4,
      });

      doc.end();
    });
  }

  private async storePdf(userId: string, type: DocumentType, pdfBuffer: Buffer) {
    const storageClient = this.getStorageClient();
    const timestamp = Date.now();
    const fileName = `${type}-${timestamp}.pdf`;
    const storagePath = `${userId}/${fileName}`;

    if (!storageClient) {
      return {
        fileUrl: `inline://${fileName}`,
        downloadUrl: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
      };
    }

    const { error: uploadError } = await storageClient.storage
      .from(this.storageBucket)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      return {
        fileUrl: `inline://${fileName}`,
        downloadUrl: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
      };
    }

    const expirySeconds = Number(process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS ?? 60 * 60 * 24 * 7);
    const { data: signedData } = await storageClient.storage
      .from(this.storageBucket)
      .createSignedUrl(storagePath, expirySeconds);

    return {
      fileUrl: `supabase://${this.storageBucket}/${storagePath}`,
      downloadUrl: signedData?.signedUrl ?? null,
    };
  }

  private async toResponse(row: {
    id: string;
    type: string;
    title: string;
    fileUrl: string;
    createdAt: Date;
  }): Promise<GeneratedDocumentResult> {
    let downloadUrl: string | null = null;

    if (row.fileUrl.startsWith('inline://')) {
      downloadUrl = null;
    } else if (row.fileUrl.startsWith('supabase://')) {
      const storageClient = this.getStorageClient();
      if (storageClient) {
        const storagePath = row.fileUrl.replace(`supabase://${this.storageBucket}/`, '');
        const expirySeconds = Number(process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS ?? 60 * 60 * 24 * 7);
        const { data } = await storageClient.storage
          .from(this.storageBucket)
          .createSignedUrl(storagePath, expirySeconds);
        downloadUrl = data?.signedUrl ?? null;
      }
    }

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      fileUrl: row.fileUrl,
      downloadUrl,
      createdAt: row.createdAt,
    };
  }

  async generate(userId: string, dto: GenerateDocumentDto) {
    const validation = validateTemplateInput(dto.type, dto.formData);
    if (!validation.valid) {
      throw new BadRequestException(`Missing required fields: ${validation.missing.join(', ')}`);
    }

    const generatedAtIso = new Date().toISOString();
    const title = dto.title?.trim() || `${dto.type.replaceAll('_', ' ')} document`;

    const bodyText = renderDocumentText({
      type: dto.type,
      title,
      formData: dto.formData,
      generatedAtIso,
    });

    const pdfBuffer = await this.buildPdfBuffer({ title, bodyText });
    const stored = await this.storePdf(userId, dto.type, pdfBuffer);

    try {
      await this.profilesService.ensureProfile(userId);

      const row = await this.prisma.document.create({
        data: {
          userId,
          caseId: dto.caseId,
          type: dto.type,
          title,
          fileUrl: stored.fileUrl,
          formData: dto.formData,
        },
      });

      await this.auditLogService.log({
        userId,
        action: 'document.generate',
        resource: `documents:${row.id}`,
        metadata: {
          type: row.type,
          title: row.title,
          caseId: row.caseId,
        },
      });

      return {
        id: row.id,
        type: row.type,
        title: row.title,
        fileUrl: row.fileUrl,
        downloadUrl: stored.downloadUrl,
        createdAt: row.createdAt,
      };
    } catch (error) {
      this.logger.error('Document persistence failed. Returning generated file without DB record.');
      this.logger.error(error instanceof Error ? error.message : 'Unknown document persistence error');

      return {
        id: `temp-${Date.now()}`,
        type: dto.type,
        title,
        fileUrl: stored.fileUrl,
        downloadUrl:
          stored.downloadUrl ?? `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
        createdAt: new Date(),
      };
    }
  }

  async summarize(userId: string, file: Express.Multer.File, dto: SummarizeDocumentDto) {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Only PDF files are supported');
    }

    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype || 'application/pdf',
    });

    let summaryResponse: { summary: string; char_count: number; model: string };

    try {
      const response = await axios.post<{ summary: string; char_count: number; model: string }>(
        `${this.aiUrl}/summarize`,
        form,
        { headers: form.getHeaders() },
      );
      summaryResponse = response.data;
    } catch (error) {
      this.logger.error('AI summarize endpoint failed');
      this.logger.error(error instanceof Error ? error.message : 'Unknown summarize error');
      throw new BadRequestException('Unable to summarize this document right now');
    }

    const shouldSave = dto.saveResult ?? true;
    let savedDocument: GeneratedDocumentResult | null = null;

    if (shouldSave) {
      try {
        await this.profilesService.ensureProfile(userId);

        const row = await this.prisma.document.create({
          data: {
            userId,
            caseId: dto.caseId,
            type: 'judgment_summary',
            title: dto.title?.trim() || `Judgment Summary - ${file.originalname}`,
            fileUrl: `inline://summary-${Date.now()}.txt`,
            formData: {
              sourceFileName: file.originalname,
              sourceMimeType: file.mimetype,
              model: summaryResponse.model,
              charCount: summaryResponse.char_count,
              summary: summaryResponse.summary,
            },
          },
        });

        savedDocument = {
          id: row.id,
          type: row.type,
          title: row.title,
          fileUrl: row.fileUrl,
          downloadUrl: null,
          createdAt: row.createdAt,
        };

        await this.auditLogService.log({
          userId,
          action: 'document.summarize',
          resource: `documents:${row.id}`,
          metadata: {
            model: summaryResponse.model,
            sourceFileName: file.originalname,
            charCount: summaryResponse.char_count,
          },
        });
      } catch (error) {
        this.logger.warn('Summary generated but persistence failed. Returning summary without saved record.');
        this.logger.warn(error instanceof Error ? error.message : 'Unknown summarize persistence error');
      }
    }

    return {
      summary: summaryResponse.summary,
      charCount: summaryResponse.char_count,
      model: summaryResponse.model,
      saved: Boolean(savedDocument),
      document: savedDocument,
    };
  }

  async list(userId: string) {
    let rows: Array<{
      id: string;
      type: string;
      title: string;
      fileUrl: string;
      createdAt: Date;
    }> = [];

    try {
      rows = await this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.warn('Document list unavailable (database issue). Returning empty list.');
      this.logger.warn(error instanceof Error ? error.message : 'Unknown documents list error');
      return [];
    }

    const mapped = await Promise.all(
      rows.map((row) =>
        this.toResponse({
          id: row.id,
          type: row.type,
          title: row.title,
          fileUrl: row.fileUrl,
          createdAt: row.createdAt,
        }),
      ),
    );

    return mapped;
  }

  async getOne(userId: string, id: string) {
    let row: {
      id: string;
      type: string;
      title: string;
      fileUrl: string;
      createdAt: Date;
    } | null = null;

    try {
      row = await this.prisma.document.findFirst({
        where: { id, userId },
      });
    } catch (error) {
      this.logger.warn('Document retrieval unavailable (database issue).');
      this.logger.warn(error instanceof Error ? error.message : 'Unknown document get error');
      throw new NotFoundException('Document not found');
    }

    if (!row) {
      throw new NotFoundException('Document not found');
    }

    return this.toResponse({
      id: row.id,
      type: row.type,
      title: row.title,
      fileUrl: row.fileUrl,
      createdAt: row.createdAt,
    });
  }
}
