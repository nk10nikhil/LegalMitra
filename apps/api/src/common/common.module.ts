import { Global, Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  providers: [RateLimitService, AuditLogService],
  exports: [RateLimitService, AuditLogService],
})
export class CommonModule {}
