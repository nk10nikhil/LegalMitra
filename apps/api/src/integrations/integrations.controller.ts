import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('sync-all')
  @ProtectedRoute()
  syncAll(@CurrentUser() user: { id: string }) {
    return this.integrationsService.enqueueUserCaseSync(user.id);
  }

  @Post('sync-case/:id')
  @ProtectedRoute()
  syncCase(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.integrationsService.enqueueSingleCaseSync(user.id, id);
  }

  @Get('jobs/:id')
  @ProtectedRoute()
  jobStatus(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.integrationsService.getJobStatus(user.id, id);
  }
}
