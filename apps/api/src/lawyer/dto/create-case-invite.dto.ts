import { IsEmail, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCaseInviteDto {
  @IsUUID()
  caseId!: string;

  @IsEmail()
  @MaxLength(320)
  inviteeEmail!: string;

  @IsString()
  @MaxLength(280)
  message!: string;
}
