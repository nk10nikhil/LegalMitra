import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('me')
  @ProtectedRoute()
  me(@CurrentUser() user: { id: string }) {
    return this.reportsService.myReport(user.id);
  }
}
