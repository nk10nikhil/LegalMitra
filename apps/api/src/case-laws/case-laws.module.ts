import { Module } from '@nestjs/common';
import { CaseLawsController } from './case-laws.controller';
import { CaseLawsService } from './case-laws.service';

@Module({
  controllers: [CaseLawsController],
  providers: [CaseLawsService],
  exports: [CaseLawsService],
})
export class CaseLawsModule {}
