import { IsIn } from 'class-validator';

export class DecideSettlementDto {
  @IsIn(['accepted', 'rejected'])
  decision!: 'accepted' | 'rejected';
}
