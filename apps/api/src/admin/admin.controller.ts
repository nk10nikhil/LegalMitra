import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { AdminService } from './admin.service';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  @ProtectedRoute()
  metrics(@CurrentUser() user: { id: string }) {
    return this.adminService.metrics(user.id);
  }

  @Get('users')
  @ProtectedRoute()
  users(@CurrentUser() user: { id: string }, @Query() query: ListAdminUsersDto) {
    return this.adminService.listUsers(user.id, query);
  }

  @Patch('users/:id')
  @ProtectedRoute()
  updateUser(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(user.id, id, body);
  }
}
