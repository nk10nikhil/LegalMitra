import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ProtectedRoute } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CasesService } from './cases.service';
import { TrackCaseDto } from './dto/track-case.dto';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post('track')
  @ProtectedRoute()
  trackCase(@CurrentUser() user: { id: string }, @Body() dto: TrackCaseDto) {
    return this.casesService.track(user.id, dto);
  }

  @Get()
  @ProtectedRoute()
  getCases(@CurrentUser() user: { id: string }) {
    return this.casesService.list(user.id);
  }

  @Get(':id')
  @ProtectedRoute()
  getCaseDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.casesService.detail(user.id, id);
  }

  @Post(':id/refresh')
  @ProtectedRoute()
  refreshCase(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.casesService.refresh(user.id, id);
  }
}
