import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddCaseNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  note!: string;
}
