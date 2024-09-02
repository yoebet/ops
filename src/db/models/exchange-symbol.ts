import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '@/db/models/base-model';
import { ExAccountCode, ExchangeCode } from '@/exchange/exchanges-types';
import { SymbolConfig } from '@/db/models/symbol-config';
import { Exclude } from 'class-transformer';

@Entity()
@Index(['ex', 'symbol'], { unique: true })
@Index(['exAccount', 'symbol'], { unique: true })
export class ExchangeSymbol extends BaseModel {
  @Column()
  ex: ExchangeCode;

  @Column()
  exAccount: ExAccountCode;

  @Column()
  symbol: string;

  @Column({ comment: '交易所 symbol' })
  rawSymbol: string;

  @Column({ comment: '价格精度' })
  priceTickStr: string;

  @Exclude()
  @Column({ type: 'bool', default: true })
  enabled = true;

  @ManyToOne(() => SymbolConfig, { cascade: false, nullable: true })
  @JoinColumn({ name: 'symbol', referencedColumnName: 'symbol' })
  symbolConfig?: SymbolConfig;

  @Column({
    comment:
      'ws接口中 交易数量与币的比例：比如 1=0.1个币 这里就填 0.1;反向合约 1=100U:这里就填100',
    nullable: true,
  })
  contractSizeStr: string;

  @Column({ default: 0 })
  displayOrder: number;

  @Exclude()
  @Column({ default: true })
  visibleToClient: boolean;
}
