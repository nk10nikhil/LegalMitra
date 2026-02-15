import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

const HEARING_STATUSES = ['scheduled', 'completed', 'cancelled'] as const;

export class UpdateHearingStatusDto {
  @IsString()
  @IsIn(HEARING_STATUSES)
  status!: (typeof HEARING_STATUSES)[number];

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  recordingUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  transcript?: string;
}
