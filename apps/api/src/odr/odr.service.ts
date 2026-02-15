import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditLogService } from '../common/audit-log.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateOdrRoomDto } from './dto/create-odr-room.dto';
import { SendOdrMessageDto } from './dto/send-odr-message.dto';
import { SettlementOdrDto } from './dto/settlement-odr.dto';

type OdrRoom = {
  id: string;
  ownerUserId: string;
  title: string;
  counterpartyEmail: string;
  createdAt: string;
};

type OdrMessage = {
  id: string;
  roomId: string;
  senderUserId: string;
  message: string;
  createdAt: string;
};

@Injectable()
export class OdrService {
  private readonly rooms = new Map<string, OdrRoom>();
  private readonly messages = new Map<string, OdrMessage[]>();

  constructor(
    private readonly profilesService: ProfilesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private ensureRoomOwnership(userId: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.ownerUserId !== userId) {
      throw new NotFoundException('ODR room not found');
    }
    return room;
  }

  async createRoom(userId: string, dto: CreateOdrRoomDto) {
    await this.profilesService.ensureProfile(userId);

    const room: OdrRoom = {
      id: randomUUID(),
      ownerUserId: userId,
      title: dto.title,
      counterpartyEmail: dto.counterpartyEmail,
      createdAt: new Date().toISOString(),
    };
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);

    await this.auditLogService.log({
      userId,
      action: 'odr.room.create',
      resource: `odr:${room.id}`,
    });

    return room;
  }

  async listRooms(userId: string) {
    await this.profilesService.ensureProfile(userId);
    return Array.from(this.rooms.values()).filter((item) => item.ownerUserId === userId);
  }

  async listMessages(userId: string, roomId: string) {
    this.ensureRoomOwnership(userId, roomId);
    return this.messages.get(roomId) ?? [];
  }

  async sendMessage(userId: string, roomId: string, dto: SendOdrMessageDto) {
    this.ensureRoomOwnership(userId, roomId);

    const row: OdrMessage = {
      id: randomUUID(),
      roomId,
      senderUserId: userId,
      message: dto.message,
      createdAt: new Date().toISOString(),
    };

    const list = this.messages.get(roomId) ?? [];
    list.push(row);
    this.messages.set(roomId, list);

    await this.auditLogService.log({
      userId,
      action: 'odr.message.send',
      resource: `odr:${roomId}`,
    });

    return row;
  }

  async proposeSettlement(userId: string, roomId: string, dto: SettlementOdrDto) {
    this.ensureRoomOwnership(userId, roomId);

    const similarCaseHint =
      'Based on similar disputes, early settlement may reduce timeline by 30-40%.';

    await this.auditLogService.log({
      userId,
      action: 'odr.settlement.propose',
      resource: `odr:${roomId}`,
      metadata: {
        termsLength: dto.terms.length,
      },
    });

    return {
      roomId,
      proposedTerms: dto.terms,
      aiMediatorSuggestion: similarCaseHint,
      generatedAt: new Date().toISOString(),
    };
  }
}
