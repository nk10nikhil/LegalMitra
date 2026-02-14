import { IsString, Length } from 'class-validator';

export class TrackCaseDto {
  @IsString()
  @Length(3, 100)
  caseNumber!: string;

  @IsString()
  @Length(2, 24)
  courtCode!: string;
}
