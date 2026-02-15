import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { CreateHearingDto } from './dto/create-hearing.dto';
import { UpdateHearingStatusDto } from './dto/update-hearing-status.dto';
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
}
