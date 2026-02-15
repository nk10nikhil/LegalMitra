import { IsBoolean, IsIn, IsOptional } from 'class-validator';

const ROLES = ['citizen', 'lawyer', 'judge', 'admin'] as const;

export class UpdateAdminUserDto {
  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
