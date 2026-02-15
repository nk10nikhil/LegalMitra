import { IsOptional, IsString, MaxLength } from 'class-validator';

export class IngestTranscriptDto {
  @IsString()
  @MaxLength(50000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;
}
