import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      throw new Error('Missing DATABASE_URL. Add it to apps/api/.env before starting the API.');
    }
    await this.$connect();
  }
}
