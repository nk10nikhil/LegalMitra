import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProtectedRoute } from '../auth/auth.guard';
import { CreateOdrRoomDto } from './dto/create-odr-room.dto';
import { DecideSettlementDto } from './dto/decide-settlement.dto';
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

  @Get('rooms/:id/prediction')
  @ProtectedRoute()
  prediction(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.odrService.getRoomPrediction(user.id, id);
  }

  @Get('rooms/:id/settlements')
  @ProtectedRoute()
  settlements(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.odrService.listSettlements(user.id, id);
  }

  @Post('rooms/:id/settlements/:settlementId/decision')
  @ProtectedRoute()
  decideSettlement(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('settlementId') settlementId: string,
    @Body() body: DecideSettlementDto,
  ) {
    return this.odrService.decideSettlement(user.id, id, settlementId, body.decision);
  }
}
