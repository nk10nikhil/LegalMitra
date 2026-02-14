import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureProfile(userId: string, userEmail?: string) {
    return this.prisma.profile.upsert({
      where: { id: userId },
      update: userEmail ? { email: userEmail } : {},
      create: { id: userId, role: 'citizen', email: userEmail },
    });
  }

  async me(userId: string, userEmail?: string) {
    const profile = await this.ensureProfile(userId, userEmail);
    return {
      id: profile.id,
      role: profile.role,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      dob: profile.dob,
      aadhaarMasked: profile.aadhaarLast4 ? `XXXXXXXX${profile.aadhaarLast4}` : null,
      verified: profile.verified,
    };
  }

  async update(userId: string, input: UpdateProfileDto, userEmail?: string) {
    await this.ensureProfile(userId, userEmail);

    const aadhaarHash = input.aadhaarNumber
      ? createHash('sha256').update(input.aadhaarNumber).digest('hex')
      : undefined;

    const aadhaarLast4 = input.aadhaarNumber ? input.aadhaarNumber.slice(-4) : undefined;

    const profile = await this.prisma.profile.update({
      where: { id: userId },
      data: {
        role: input.role,
        fullName: input.fullName,
        email: input.email ?? userEmail,
        phone: input.phone,
        dob: input.dob ? new Date(input.dob) : undefined,
        aadhaarHash,
        aadhaarLast4,
      },
    });

    return {
      id: profile.id,
      role: profile.role,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      dob: profile.dob,
      aadhaarMasked: profile.aadhaarLast4 ? `XXXXXXXX${profile.aadhaarLast4}` : null,
      verified: profile.verified,
    };
  }
}
