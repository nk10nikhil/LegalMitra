import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { LawyerController } from './lawyer.controller';
import { LawyerService } from './lawyer.service';

@Module({
  imports: [ProfilesModule],
  controllers: [LawyerController],
  providers: [LawyerService],
  exports: [LawyerService],
})
export class LawyerModule {}
