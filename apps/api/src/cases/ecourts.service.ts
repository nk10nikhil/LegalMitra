import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

interface ECourtsFetchInput {
  caseNumber: string;
  courtCode: string;
}

export interface ECourtsCasePayload {
  status: string;
  nextHearing: Date | null;
  raw: Record<string, unknown>;
}

@Injectable()
export class ECourtsService {
  private readonly logger = new Logger(ECourtsService.name);
  private readonly baseUrl = process.env.ECOURTS_BASE_URL ?? 'https://services.ecourts.gov.in';

  async fetchCaseFromECourts(input: ECourtsFetchInput): Promise<ECourtsCasePayload> {
    try {
      const response = await axios.get(`${this.baseUrl}/ecourtindia_v6/`, {
        timeout: 12000,
        params: {
          case_no: input.caseNumber,
          state_cd: input.courtCode,
        },
      });

      const $ = cheerio.load(response.data);
      const status = $('td:contains("Case Status")').next().text().trim() || 'Pending';
      const hearingText = $('td:contains("Next Hearing Date")').next().text().trim();
      const nextHearing = hearingText ? new Date(hearingText) : null;

      return {
        status,
        nextHearing: Number.isNaN(nextHearing?.getTime()) ? null : nextHearing,
        raw: {
          source: 'ecourts',
          fetchedAt: new Date().toISOString(),
          htmlPreview: String(response.data).slice(0, 10000),
          parsed: {
            status,
            hearingText,
          },
        },
      };
    } catch (error) {
      this.logger.warn(`eCourts fetch failed for ${input.caseNumber}/${input.courtCode}`);
      return {
        status: 'Unknown',
        nextHearing: null,
        raw: {
          source: 'ecourts',
          fallback: true,
          fetchedAt: new Date().toISOString(),
          message: 'Unable to fetch live data from eCourts at this time',
          request: input,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
