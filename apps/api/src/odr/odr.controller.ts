import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { CreateOdrRoomDto } from './dto/create-odr-room.dto';
import { SendOdrMessageDto } from './dto/send-odr-message.dto';
import { SettlementOdrDto } from './dto/settlement-odr.dto';
import { OdrService } from './odr.service';

@Controller('odr')
export class OdrController {
  constructor(private readonly odrService: OdrService) {}

  @Post('rooms')
  @ProtectedRoute()
  createRoom(@CurrentUser() user: { id: string }, @Body() body: CreateOdrRoomDto) {
    return this.odrService.createRoom(user.id, body);
  }

  @Get('rooms')
  @ProtectedRoute()
  listRooms(@CurrentUser() user: { id: string }) {
    return this.odrService.listRooms(user.id);
  }

  @Get('rooms/:id/messages')
  @ProtectedRoute()
  listMessages(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.odrService.listMessages(user.id, id);
  }

  @Post('rooms/:id/messages')
  @ProtectedRoute()
  sendMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: SendOdrMessageDto,
  ) {
    return this.odrService.sendMessage(user.id, id, body);
  }

  @Post('rooms/:id/settlement')
  @ProtectedRoute()
  settlement(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: SettlementOdrDto,
  ) {
    return this.odrService.proposeSettlement(user.id, id, body);
  }
}
