import { Body, Controller, Get, Put } from '@nestjs/common';
import { ProtectedRoute } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ProtectedRoute()
  getMyProfile(@CurrentUser() user: { id: string; email?: string }) {
    return this.profilesService.me(user.id, user.email);
  }

  @Put('me')
  @ProtectedRoute()
  updateMyProfile(
    @CurrentUser() user: { id: string; email?: string },
    @Body() body: UpdateProfileDto,
  ) {
    return this.profilesService.update(user.id, body, user.email);
  }
}
