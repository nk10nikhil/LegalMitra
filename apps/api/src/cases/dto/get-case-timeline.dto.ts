import { IsDateString, IsIn, IsOptional } from 'class-validator';

const TIMELINE_TYPES = ['case_created', 'hearing', 'note', 'document', 'audit'] as const;

export class GetCaseTimelineDto {
  @IsOptional()
  @IsIn(TIMELINE_TYPES)
  type?: (typeof TIMELINE_TYPES)[number];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
