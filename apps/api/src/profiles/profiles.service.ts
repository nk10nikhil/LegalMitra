import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureProfile(userId: string) {
    return this.prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, role: 'citizen' },
    });
  }

  async me(userId: string) {
    const profile = await this.ensureProfile(userId);
    return {
      id: profile.id,
      role: profile.role,
      fullName: profile.fullName,
      phone: profile.phone,
      verified: profile.verified,
    };
  }
}
