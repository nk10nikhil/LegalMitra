import { IsArray, IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateInvoiceDto {
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  entryIds?: string[];
}
