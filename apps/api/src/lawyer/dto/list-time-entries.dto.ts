import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListTimeEntriesDto {
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
