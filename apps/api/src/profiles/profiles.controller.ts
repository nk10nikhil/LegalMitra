import { Controller, Get } from '@nestjs/common';
import { ProtectedRoute } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ProtectedRoute()
  getMyProfile(@CurrentUser() user: { id: string }) {
    return this.profilesService.me(user.id);
  }
}
