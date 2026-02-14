import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AskAiDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  question!: string;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'hi'])
  language?: 'en' | 'hi';
}
