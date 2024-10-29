import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UnifiedSymbol } from '@/db/models/unified-symbol';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';

@Entity({ synchronize: false })
export class ExSymbolEnabled extends ExchangeSymbol {
  @ManyToOne(() => UnifiedSymbol, { cascade: false, nullable: true })
  @JoinColumn({ name: 'symbol', referencedColumnName: 'symbol' })
  unifiedSymbol: UnifiedSymbol;
}
