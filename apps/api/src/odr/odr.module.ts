import { Module } from '@nestjs/common';
import { OdrController } from './odr.controller';
import { OdrService } from './odr.service';

@Module({
  controllers: [OdrController],
  providers: [OdrService],
  exports: [OdrService],
})
export class OdrModule {}
