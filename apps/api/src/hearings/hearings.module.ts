import { Module } from '@nestjs/common';
import { HearingsController } from './hearings.controller';
import { HearingsService } from './hearings.service';

@Module({
  controllers: [HearingsController],
  providers: [HearingsService],
  exports: [HearingsService],
})
export class HearingsModule {}
