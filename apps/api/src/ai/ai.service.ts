import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { AskAiDto } from './dto/ask-ai.dto';
import { PredictAiDto } from './dto/predict-ai.dto';
import { AuditLogService } from '../common/audit-log.service';

type HistoryRole = 'user' | 'assistant';

type HistoryItem = {
  role: HistoryRole;
  text: string;
  confidence?: number;
  sourceId?: string | null;
  disclaimer?: string;
  createdAt: string;
};

type AiAskResponse = {
  answer: string;
  confidence: number;
  language: string;
  source_id?: string | null;
  disclaimer: string;
};

type AiPredictResponse = {
  success_probability: number;
  similar_cases: number;
  model: string;
  disclaimer: string;
};

@Injectable()
export class AiService {
  private readonly aiUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
  private readonly historyByUser = new Map<string, HistoryItem[]>();
  private readonly maxHistoryPerUser = 50;

  constructor(private readonly auditLogService: AuditLogService) {}

  private appendHistory(userId: string, item: HistoryItem) {
    const existing = this.historyByUser.get(userId) ?? [];
    const updated = [...existing, item].slice(-this.maxHistoryPerUser);
    this.historyByUser.set(userId, updated);
  }

  getHistory(userId: string): HistoryItem[] {
    return this.historyByUser.get(userId) ?? [];
  }

  async ask(userId: string, payload: AskAiDto): Promise<AiAskResponse> {
    try {
      const response = await axios.post<AiAskResponse>(`${this.aiUrl}/ai/ask`, {
        question: payload.question,
        language: payload.language ?? 'en',
      });

      const now = new Date().toISOString();
      this.appendHistory(userId, {
        role: 'user',
        text: payload.question,
        createdAt: now,
      });
      this.appendHistory(userId, {
        role: 'assistant',
        text: response.data.answer,
        confidence: response.data.confidence,
        sourceId: response.data.source_id,
        disclaimer: response.data.disclaimer,
        createdAt: now,
      });

      await this.auditLogService.log({
        userId,
        action: 'ai.ask',
        resource: 'ai:qna',
        metadata: {
          language: response.data.language,
          confidence: response.data.confidence,
          sourceId: response.data.source_id ?? null,
        },
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(
          error.response.data ?? { message: 'AI service failed' },
          error.response.status,
        );
      }

      throw new ServiceUnavailableException(
        'AI service is unavailable. Check AI_SERVICE_URL and AI service health.',
      );
    }
  }

  async predict(userId: string, payload: PredictAiDto): Promise<AiPredictResponse> {
    try {
      const response = await axios.post<AiPredictResponse>(`${this.aiUrl}/predict`, payload);

      await this.auditLogService.log({
        userId,
        action: 'ai.predict',
        resource: 'ai:prediction',
        metadata: {
          court: payload.court,
          year: payload.year,
          actsCitedCount: payload.acts_cited_count,
          priorHearings: payload.prior_hearings,
          successProbability: response.data.success_probability,
          similarCases: response.data.similar_cases,
          model: response.data.model,
        },
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new HttpException(
          error.response.data ?? { message: 'AI prediction service failed' },
          error.response.status,
        );
      }

      throw new ServiceUnavailableException(
        'AI prediction service is unavailable. Check AI_SERVICE_URL and AI service health.',
      );
    }
  }
}
