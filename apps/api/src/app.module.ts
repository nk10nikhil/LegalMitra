import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { CasesModule } from './cases/cases.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { CommonModule } from './common/common.module';
import { HealthController } from './health.controller';
import { AiModule } from './ai/ai.module';
import { DocumentsModule } from './documents/documents.module';
import { CaseLawsModule } from './case-laws/case-laws.module';
import { HearingsModule } from './hearings/hearings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { RealtimeModule } from './realtime/realtime.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { OdrModule } from './odr/odr.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LawyerModule } from './lawyer/lawyer.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    PrismaModule,
    AuthModule,
    CommonModule,
    RealtimeModule,
    ProfilesModule,
    CasesModule,
    AiModule,
    DocumentsModule,
    CaseLawsModule,
    HearingsModule,
    NotificationsModule,
    AuditLogsModule,
    AdminModule,
    ReportsModule,
    IntegrationsModule,
    OdrModule,
    AnalyticsModule,
    LawyerModule,
  ],
})
export class AppModule {}
