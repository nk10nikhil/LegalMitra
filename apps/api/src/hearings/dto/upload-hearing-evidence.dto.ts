import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadHearingEvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;
}
