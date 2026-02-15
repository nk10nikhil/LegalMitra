import { IsString, MaxLength, MinLength } from 'class-validator';

export class SettlementOdrDto {
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  terms!: string;
}
