import { Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Post('digilocker/fetch/:caseId')
  @ProtectedRoute()
  fetchDigiLocker(@CurrentUser() user: { id: string }, @Param('caseId') caseId: string) {
    return this.integrationsService.enqueueDigiLockerFetch(user.id, caseId);
  }

  @Get('digilocker/requests')
  @ProtectedRoute()
  listDigiLockerRequests(@CurrentUser() user: { id: string }, @Query('caseId') caseId?: string) {
    return this.integrationsService.listDigiLockerRequests(user.id, caseId);
  }

  @Get('digilocker/requests/:id')
  @ProtectedRoute()
  digiLockerRequest(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.integrationsService.getDigiLockerRequest(user.id, id);
  }

  @Post('fir/fetch/:caseId')
  @ProtectedRoute()
  fetchFir(@CurrentUser() user: { id: string }, @Param('caseId') caseId: string) {
    return this.integrationsService.enqueueFirFetch(user.id, caseId);
  }

  @Get('fir/requests')
  @ProtectedRoute()
  listFirRequests(@CurrentUser() user: { id: string }, @Query('caseId') caseId?: string) {
    return this.integrationsService.listFirRequests(user.id, caseId);
  }

  @Get('fir/requests/:id')
  @ProtectedRoute()
  firRequest(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.integrationsService.getFirRequest(user.id, id);
  }

  @Post('land-records/fetch/:caseId')
  @ProtectedRoute()
  fetchLandRecords(@CurrentUser() user: { id: string }, @Param('caseId') caseId: string) {
    return this.integrationsService.enqueueLandRecordsFetch(user.id, caseId);
  }

  @Get('land-records/requests')
  @ProtectedRoute()
  listLandRecordsRequests(@CurrentUser() user: { id: string }, @Query('caseId') caseId?: string) {
    return this.integrationsService.listLandRecordsRequests(user.id, caseId);
  }

  @Get('land-records/requests/:id')
  @ProtectedRoute()
  landRecordsRequest(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.integrationsService.getLandRecordsRequest(user.id, id);
  }
}
