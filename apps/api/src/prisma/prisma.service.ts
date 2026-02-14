import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      throw new Error('Missing DATABASE_URL. Add it to apps/api/.env before starting the API.');
    }

    try {
      await this.$connect();
    } catch (error) {
      const shouldAllowBoot = process.env.ALLOW_API_START_WITHOUT_DB === 'true';
      if (!shouldAllowBoot) {
        throw error;
      }

      this.logger.error(
        'Database connection failed at startup. API will continue for non-database endpoints only.',
      );
      this.logger.error(error instanceof Error ? error.message : 'Unknown database error');
    }
  }
}
