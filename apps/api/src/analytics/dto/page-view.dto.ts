import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PageViewDto {
  @IsString()
  @MaxLength(512)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;
}
