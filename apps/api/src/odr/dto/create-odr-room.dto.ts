import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOdrRoomDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  counterpartyEmail!: string;
}
