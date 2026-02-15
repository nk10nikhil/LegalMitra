import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly realtimeService: RealtimeService) {}

  afterInit() {
    this.realtimeService.setServer(this.server);
    this.logger.log('Realtime gateway initialized');
  }

  handleConnection(client: Socket) {
    const fromAuth = client.handshake.auth?.userId as string | undefined;
    const fromQuery = client.handshake.query?.userId as string | undefined;
    const userId = fromAuth ?? fromQuery;

    if (userId) {
      client.join(`user:${userId}`);
      this.logger.log(`Socket ${client.id} joined user room user:${userId}`);
    }
  }

  @SubscribeMessage('join_user_room')
  joinUserRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: { userId?: string }) {
    if (!payload?.userId) return;
    client.join(`user:${payload.userId}`);
  }
}
