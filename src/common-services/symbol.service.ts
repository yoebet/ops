import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { ExchangeSymbolEnabled } from '@/db/models/exchange-symbol-enabled';

@Injectable()
export class SymbolService implements OnModuleInit {
  private exchangeSymbols: ExchangeSymbolEnabled[] = [];
  // exAccount:symbol -> rawSymbol
  private rawSymbolMap = new Map<string, string>();
  // exAccount:rawSymbol -> ExchangeSymbol
  private exchangeSymbolMap = new Map<string, ExchangeSymbolEnabled>(); // with SymbolConfig

  constructor(private logger: AppLogger) {
    logger.setContext('symbol-service');
  }

  async onModuleInit() {
    const sc: keyof ExchangeSymbolEnabled = 'symbolConfig';
    const ess = await ExchangeSymbolEnabled.find({
      relations: [sc],
    });
    this.exchangeSymbols = ess;
    for (const es of ess) {
      const rawSymbolKey = this.genExSymbolKey(es.exAccount, es.rawSymbol);
      this.exchangeSymbolMap.set(rawSymbolKey, es);
      const symbolKey = this.genExSymbolKey(es.exAccount, es.symbol);
      this.rawSymbolMap.set(symbolKey, es.rawSymbol);
    }
  }

  async getExchangeSymbols() {
    return this.exchangeSymbols;
  }

  private genExSymbolKey(exAccount: string, symbol: string) {
    return `${exAccount}:${symbol}`;
  }

  getExchangeSymbol(exAccount: string, rawSymbol: string) {
    const rawSymbolKey = this.genExSymbolKey(exAccount, rawSymbol);
    return this.exchangeSymbolMap.get(rawSymbolKey);
  }

  getSymbol(exAccount: string, rawSymbol: string) {
    const rawSymbolKey = this.genExSymbolKey(exAccount, rawSymbol);
    const es = this.exchangeSymbolMap.get(rawSymbolKey);
    return es?.symbol;
  }

  getRawSymbol(exAccount: string, symbol: string) {
    const symbolKey = this.genExSymbolKey(exAccount, symbol);
    return this.rawSymbolMap.get(symbolKey);
  }
}
