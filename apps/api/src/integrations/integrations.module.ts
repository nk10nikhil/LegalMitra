import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CasesModule } from '../cases/cases.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsProcessor } from './integrations.processor';
import { IntegrationsService } from './integrations.service';
import { INTEGRATION_SYNC_QUEUE } from './integrations.constants';

@Module({
  imports: [
    CasesModule,
    BullModule.registerQueue({
      name: INTEGRATION_SYNC_QUEUE,
    }),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationsProcessor],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
