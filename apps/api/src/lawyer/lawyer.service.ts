import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateCaseInviteDto } from './dto/create-case-invite.dto';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { ListTimeEntriesDto } from './dto/list-time-entries.dto';

@Injectable()
export class LawyerService {
  private readonly storageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'legal-documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly profilesService: ProfilesService,
  ) {}

  private async ensureLawyer(userId: string) {
    await this.profilesService.ensureProfile(userId);
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (profile?.role !== 'lawyer') {
      throw new ForbiddenException('Lawyer access required');
    }
  }

  private getStorageClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return null;
    return createClient(supabaseUrl, serviceRoleKey);
  }

  private buildPdfBuffer(payload: {
    title: string;
    lines: string[];
    totals: { hours: number; amount: number };
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(payload.title, { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown();

      payload.lines.forEach((line) => {
        doc.fontSize(10).text(line, { lineGap: 2 });
      });

      doc.moveDown();
      doc.fontSize(12).text(`Total Hours: ${payload.totals.hours.toFixed(2)}`);
      doc.fontSize(12).text(`Total Amount: ₹${payload.totals.amount.toFixed(2)}`);

      doc.end();
    });
  }

  async createTimeEntry(userId: string, dto: CreateTimeEntryDto) {
    await this.ensureLawyer(userId);

    if (dto.caseId) {
      const caseRow = await this.prisma.case.findUnique({
        where: { id: dto.caseId },
        select: { id: true },
      });
      if (!caseRow) throw new NotFoundException('Case not found');
    }

    const created = await this.prisma.lawyerTimeEntry.create({
      data: {
        lawyerId: userId,
        caseId: dto.caseId,
        description: dto.description,
        hours: dto.hours,
        hourlyRate: dto.hourlyRate,
        workedAt: new Date(dto.workedAt),
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'lawyer.time_entry.create',
      resource: `lawyer_time_entries:${created.id}`,
      metadata: {
        caseId: created.caseId,
        hours: created.hours,
        hourlyRate: created.hourlyRate,
      },
    });

    return created;
  }

  async listTimeEntries(userId: string, query: ListTimeEntriesDto) {
    await this.ensureLawyer(userId);

    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;

    return this.prisma.lawyerTimeEntry.findMany({
      where: {
        lawyerId: userId,
        caseId: query.caseId,
        workedAt: {
          gte: fromDate ?? undefined,
          lte: toDate ?? undefined,
        },
      },
      orderBy: { workedAt: 'desc' },
    });
  }

  async generateInvoice(userId: string, dto: GenerateInvoiceDto) {
    await this.ensureLawyer(userId);

    const fromDate = dto.from ? new Date(dto.from) : null;
    const toDate = dto.to ? new Date(dto.to) : null;

    const entries = await this.prisma.lawyerTimeEntry.findMany({
      where: {
        lawyerId: userId,
        caseId: dto.caseId,
        id: dto.entryIds?.length ? { in: dto.entryIds } : undefined,
        workedAt: {
          gte: fromDate ?? undefined,
          lte: toDate ?? undefined,
        },
      },
      orderBy: { workedAt: 'asc' },
    });

    if (!entries.length) {
      throw new NotFoundException('No time entries found for invoice');
    }

    const totalHours = entries.reduce((sum, row) => sum + row.hours, 0);
    const totalAmount = entries.reduce((sum, row) => sum + row.hours * row.hourlyRate, 0);

    const title = dto.title?.trim() || `Lawyer Invoice ${new Date().toISOString().slice(0, 10)}`;
    const lines = entries.map((entry) => {
      const amount = entry.hours * entry.hourlyRate;
      return `${new Date(entry.workedAt).toLocaleDateString()} • ${entry.description} • ${entry.hours.toFixed(2)}h × ₹${entry.hourlyRate.toFixed(2)} = ₹${amount.toFixed(2)}`;
    });

    const pdfBuffer = await this.buildPdfBuffer({
      title,
      lines,
      totals: { hours: totalHours, amount: totalAmount },
    });

    const storageClient = this.getStorageClient();
    const fileName = `lawyer-invoice-${Date.now()}.pdf`;
    const storagePath = `${userId}/invoices/${fileName}`;

    let fileUrl = `inline://${fileName}`;
    let downloadUrl: string | null = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    if (storageClient) {
      const { error } = await storageClient.storage
        .from(this.storageBucket)
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (!error) {
        fileUrl = `supabase://${this.storageBucket}/${storagePath}`;
        const expirySeconds = Number(
          process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS ?? 60 * 60 * 24 * 7,
        );
        const { data } = await storageClient.storage
          .from(this.storageBucket)
          .createSignedUrl(storagePath, expirySeconds);
        downloadUrl = data?.signedUrl ?? null;
      }
    }

    const document = await this.prisma.document.create({
      data: {
        userId,
        caseId: dto.caseId,
        type: 'lawyer_invoice',
        title,
        fileUrl,
        formData: {
          totalHours,
          totalAmount,
          entryIds: entries.map((entry) => entry.id),
          from: dto.from ?? null,
          to: dto.to ?? null,
        },
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'lawyer.invoice.generate',
      resource: `documents:${document.id}`,
      metadata: {
        totalHours,
        totalAmount,
        entries: entries.length,
      },
    });

    return {
      id: document.id,
      title: document.title,
      fileUrl: document.fileUrl,
      downloadUrl,
      totalHours,
      totalAmount,
      entryCount: entries.length,
      createdAt: document.createdAt,
    };
  }

  async createCaseInvite(userId: string, dto: CreateCaseInviteDto) {
    await this.ensureLawyer(userId);

    const caseRow = await this.prisma.case.findFirst({
      where: { id: dto.caseId, userId },
      select: { id: true, caseNumber: true, courtCode: true },
    });

    if (!caseRow) {
      throw new NotFoundException('Case not found or not owned by lawyer');
    }

    const created = await this.prisma.caseAccessInvite.create({
      data: {
        caseId: dto.caseId,
        lawyerId: userId,
        inviteeEmail: dto.inviteeEmail.toLowerCase(),
        status: 'pending',
      },
    });

    await this.prisma.notification.create({
      data: {
        userId,
        type: 'case_access_invite_created',
        content: {
          inviteId: created.id,
          caseId: caseRow.id,
          caseNumber: caseRow.caseNumber,
          courtCode: caseRow.courtCode,
          inviteeEmail: created.inviteeEmail,
          message: dto.message,
        },
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'lawyer.case_invite.create',
      resource: `case_access_invites:${created.id}`,
      metadata: {
        caseId: created.caseId,
        inviteeEmail: created.inviteeEmail,
      },
    });

    return created;
  }

  async listCaseInvites(userId: string) {
    await this.ensureLawyer(userId);

    return this.prisma.caseAccessInvite.findMany({
      where: { lawyerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
