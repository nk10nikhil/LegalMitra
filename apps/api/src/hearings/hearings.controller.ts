import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { CreateHearingDto } from './dto/create-hearing.dto';
import { IngestTranscriptDto } from './dto/ingest-transcript.dto';
import { UpdateHearingStatusDto } from './dto/update-hearing-status.dto';
import { UploadHearingEvidenceDto } from './dto/upload-hearing-evidence.dto';
import { HearingsService } from './hearings.service';

@Controller('hearings')
export class HearingsController {
  constructor(private readonly hearingsService: HearingsService) {}

  @Post()
  @ProtectedRoute()
  create(@CurrentUser() user: { id: string }, @Body() body: CreateHearingDto) {
    return this.hearingsService.create(user.id, body);
  }

  @Get()
  @ProtectedRoute()
  list(@CurrentUser() user: { id: string }, @Query('caseId') caseId?: string) {
    return this.hearingsService.list(user.id, caseId);
  }

  @Get(':id')
  @ProtectedRoute()
  one(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.hearingsService.getOne(user.id, id);
  }

  @Get(':id/evidence')
  @ProtectedRoute()
  evidence(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.hearingsService.listEvidence(user.id, id);
  }

  @Get(':id/transcript-segments')
  @ProtectedRoute()
  transcriptSegments(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.hearingsService.listTranscriptSegments(user.id, id);
  }

  @Get(':id/transcript-insights')
  @ProtectedRoute()
  transcriptInsights(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.hearingsService.getTranscriptInsights(user.id, id);
  }

  @Post(':id/token')
  @ProtectedRoute()
  token(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.hearingsService.generateRoomToken(user.id, id);
  }

  @Post(':id/status')
  @ProtectedRoute()
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: UpdateHearingStatusDto,
  ) {
    return this.hearingsService.updateStatus(user.id, id, body);
  }

  @Post(':id/evidence')
  @ProtectedRoute()
  @UseInterceptors(FileInterceptor('file'))
  uploadEvidence(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadHearingEvidenceDto,
  ) {
    return this.hearingsService.uploadEvidence(user.id, id, file, body);
  }

  @Post(':id/transcript/manual')
  @ProtectedRoute()
  ingestTranscript(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: IngestTranscriptDto,
  ) {
    return this.hearingsService.ingestManualTranscript(user.id, id, body);
  }

  @Post('livekit/webhook')
  livekitWebhook(
    @Body() body: Record<string, any>,
    @Headers('x-livekit-token') webhookToken?: string,
  ) {
    return this.hearingsService.handleLivekitWebhook(body, webhookToken);
  }
}
