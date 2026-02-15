import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { SearchCaseLawsDto } from './dto/search-case-laws.dto';

type EmbedResponse = {
  embedding: number[];
  dimension: number;
  model: string;
};

type CaseLawRow = {
  id: string;
  title: string;
  court: string;
  judgmentDate: Date;
  summary: string;
  fullText: string;
};

@Injectable()
export class CaseLawsService {
  private readonly logger = new Logger(CaseLawsService.name);
  private readonly aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async embedText(text: string) {
    const response = await axios.post<EmbedResponse>(`${this.aiUrl}/embed`, { text });
    return response.data;
  }

  async search(userId: string, query: SearchCaseLawsDto) {
    const q = query.q.trim();
    if (q.length < 2) {
      return [];
    }

    try {
      const embedded = await this.embedText(q);
      const embeddingLiteral = `[${embedded.embedding.join(',')}]`;
      const limit = query.limit ?? 20;

      const rows = await this.prisma.$queryRawUnsafe<CaseLawRow[]>(
        `
        select
          id,
          title,
          court,
          judgment_date as "judgmentDate",
          summary,
          full_text as "fullText"
        from public.case_laws
        where embedding is not null
          and ($1::text is null or court = $1)
          and ($2::date is null or judgment_date >= $2::date)
          and ($3::date is null or judgment_date <= $3::date)
        order by embedding <=> $4::vector
        limit $5
        `,
        query.court ?? null,
        query.yearFrom ? `${query.yearFrom}-01-01` : null,
        query.yearTo ? `${query.yearTo}-12-31` : null,
        embeddingLiteral,
        limit,
      );

      await this.auditLogService.log({
        userId,
        action: 'case_law.search',
        resource: 'case_laws',
        metadata: {
          q,
          court: query.court ?? null,
          yearFrom: query.yearFrom ?? null,
          yearTo: query.yearTo ?? null,
          limit,
          resultCount: rows.length,
          embeddingModel: embedded.model,
        },
      });

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        court: row.court,
        judgmentDate: row.judgmentDate,
        summary: row.summary,
        fullText: row.fullText,
      }));
    } catch (error) {
      this.logger.warn('Case law semantic search failed. Returning empty result set.');
      this.logger.warn(error instanceof Error ? error.message : 'Unknown case-law search error');
      return [];
    }
  }
}
