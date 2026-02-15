import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ProtectedRoute()
  list(@CurrentUser() user: { id: string }) {
    return this.notificationsService.list(user.id);
  }

  @Get('reminders')
  @ProtectedRoute()
  reminders(@CurrentUser() user: { id: string }, @Query('days') days?: string) {
    return this.notificationsService.upcomingHearingReminders(
      user.id,
      days ? Number(days) : undefined,
    );
  }

  @Post(':id/read')
  @ProtectedRoute()
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Post('read-all')
  @ProtectedRoute()
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllRead(user.id);
  }
}
