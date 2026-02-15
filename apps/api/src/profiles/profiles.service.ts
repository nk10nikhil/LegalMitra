import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditLogService } from '../common/audit-log.service';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private fallbackProfile(params: {
    userId: string;
    userEmail?: string;
    role?: 'citizen' | 'lawyer' | 'judge' | 'admin';
    fullName?: string | null;
    phone?: string | null;
    dob?: Date | null;
    aadhaarNumber?: string;
  }) {
    return {
      id: params.userId,
      role: params.role ?? 'citizen',
      fullName: params.fullName ?? null,
      email: params.userEmail ?? null,
      phone: params.phone ?? null,
      dob: params.dob ?? null,
      aadhaarMasked: params.aadhaarNumber ? `XXXXXXXX${params.aadhaarNumber.slice(-4)}` : null,
      verified: false,
    };
  }

  async ensureProfile(userId: string, userEmail?: string) {
    return this.prisma.profile.upsert({
      where: { id: userId },
      update: userEmail ? { email: userEmail } : {},
      create: { id: userId, role: 'citizen', email: userEmail },
    });
  }

  async me(userId: string, userEmail?: string) {
    try {
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
    } catch (error) {
      this.logger.error('Failed to load profile from database. Returning fallback profile.');
      this.logger.error(error instanceof Error ? error.message : 'Unknown profile fetch error');
      return this.fallbackProfile({ userId, userEmail });
    }
  }

  async update(userId: string, input: UpdateProfileDto, userEmail?: string) {
    try {
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

      await this.auditLogService.log({
        userId,
        action: 'profile.update',
        resource: `profiles:${profile.id}`,
        metadata: {
          role: profile.role,
          hasEmail: Boolean(profile.email),
          hasPhone: Boolean(profile.phone),
          hasDob: Boolean(profile.dob),
          aadhaarUpdated: Boolean(input.aadhaarNumber),
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
    } catch (error) {
      this.logger.error('Failed to update profile in database. Returning fallback profile.');
      this.logger.error(error instanceof Error ? error.message : 'Unknown profile update error');
      return this.fallbackProfile({
        userId,
        userEmail: input.email ?? userEmail,
        role: input.role,
        fullName: input.fullName,
        phone: input.phone,
        dob: input.dob ? new Date(input.dob) : null,
        aadhaarNumber: input.aadhaarNumber,
      });
    }
  }
}
