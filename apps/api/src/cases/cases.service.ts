import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from '../profiles/profiles.service';
import { TrackCaseDto } from './dto/track-case.dto';
import { ECourtsService } from './ecourts.service';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesService: ProfilesService,
    private readonly ecourtsService: ECourtsService,
  ) {}

  async track(userId: string, dto: TrackCaseDto) {
    await this.profilesService.ensureProfile(userId);

    const fetched = await this.ecourtsService.fetchCaseFromECourts({
      caseNumber: dto.caseNumber,
      courtCode: dto.courtCode,
    });

    return this.prisma.case.create({
      data: {
        userId,
        caseNumber: dto.caseNumber,
        courtCode: dto.courtCode,
        caseData: fetched.raw as any,
        nextHearing: fetched.nextHearing,
        status: fetched.status,
      },
    });
  }

  async list(userId: string) {
    const rows = await this.prisma.case.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((item: (typeof rows)[number]) => ({
      id: item.id,
      caseNumber: item.caseNumber,
      courtCode: item.courtCode,
      status: item.status,
      nextHearing: item.nextHearing,
      lastSynced: item.lastSynced,
    }));
  }

  async detail(userId: string, id: string) {
    const row = await this.prisma.case.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Case not found');

    return {
      id: row.id,
      caseNumber: row.caseNumber,
      courtCode: row.courtCode,
      status: row.status,
      nextHearing: row.nextHearing,
      lastSynced: row.lastSynced,
      createdAt: row.createdAt,
      caseData: row.caseData,
    };
  }

  async refresh(userId: string, id: string) {
    const row = await this.prisma.case.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Case not found');

    const fetched = await this.ecourtsService.fetchCaseFromECourts({
      caseNumber: row.caseNumber,
      courtCode: row.courtCode,
    });

    return this.prisma.case.update({
      where: { id: row.id },
      data: {
        status: fetched.status,
        caseData: fetched.raw as any,
        nextHearing: fetched.nextHearing,
        lastSynced: new Date(),
      },
    });
  }
}
