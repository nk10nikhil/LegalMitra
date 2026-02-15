import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class PredictAiDto {
  @IsString()
  @MaxLength(120)
  court!: string;

  @IsInt()
  @Min(1950)
  @Max(2100)
  year!: number;

  @IsString()
  @MaxLength(80)
  petitioner_type!: string;

  @IsString()
  @MaxLength(80)
  respondent_type!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  acts_cited_count!: number;

  @IsInt()
  @Min(0)
  @Max(500)
  prior_hearings!: number;
}
