import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { ECourtsService } from './ecourts.service';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [ProfilesModule],
  controllers: [CasesController],
  providers: [CasesService, ECourtsService],
  exports: [CasesService, ECourtsService],
})
export class CasesModule {}
