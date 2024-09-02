import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { SymbolConfig } from '@/db/models/symbol-config';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';

@Entity({ synchronize: false })
export class ExchangeSymbolEnabled extends ExchangeSymbol {
  @ManyToOne(() => SymbolConfig, { cascade: false, nullable: true })
  @JoinColumn({ name: 'symbol', referencedColumnName: 'symbol' })
  symbolConfig: SymbolConfig;
}
