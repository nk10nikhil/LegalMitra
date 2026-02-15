import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { OdrController } from './odr.controller';
import { OdrService } from './odr.service';

@Module({
  imports: [ProfilesModule, AiModule],
  controllers: [OdrController],
  providers: [OdrService],
  exports: [OdrService],
})
export class OdrModule {}
