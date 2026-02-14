import { IsDateString, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export enum ProfileRole {
  citizen = 'citizen',
  lawyer = 'lawyer',
  judge = 'judge',
  admin = 'admin',
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/)
  phone?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @Matches(/^[0-9]{12}$/)
  aadhaarNumber?: string;

  @IsOptional()
  @IsEnum(ProfileRole)
  role?: ProfileRole;
}
