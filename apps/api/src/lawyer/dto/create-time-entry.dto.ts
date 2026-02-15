import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTimeEntryDto {
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsNumber()
  @Min(0.1)
  hours!: number;

  @IsNumber()
  @Min(0)
  hourlyRate!: number;

  @IsDateString()
  workedAt!: string;
}
