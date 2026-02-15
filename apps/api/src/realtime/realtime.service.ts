import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: Record<string, unknown>) {
    if (!this.server) {
      this.logger.warn(`Socket server not initialized. Skipping event ${event}`);
      return;
    }
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  broadcast(event: string, payload: Record<string, unknown>) {
    if (!this.server) {
      this.logger.warn(`Socket server not initialized. Skipping event ${event}`);
      return;
    }
    this.server.emit(event, payload);
  }
}
