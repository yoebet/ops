import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';

@Injectable()
export class SymbolService implements OnModuleInit {
  private exchangeSymbols: ExchangeSymbol[] = [];
  // ex:market:rawSymbol -> ExchangeSymbol
  private rawSymbolMap = new Map<string, ExchangeSymbol>(); // with unifiedConfig
  // ex:symbol -> ExchangeSymbol
  private exSymbolMap = new Map<string, ExchangeSymbol>();

  constructor(private logger: AppLogger) {
    logger.setContext('symbol-service');
  }

  async onModuleInit() {
    // await this.reload();
  }

  async ensureLoaded() {
    if (this.exchangeSymbols.length === 0) {
      await this.reload();
    }
  }

  async reload() {
    const sc: keyof ExchangeSymbol = 'unifiedSymbol';
    const ess = await ExchangeSymbol.find({
      relations: [sc],
    });
    this.exchangeSymbols = ess;

    this.rawSymbolMap.clear();
    this.exSymbolMap.clear();
    for (const es of ess) {
      const rawSymbolKey = this.genKey(es.ex, es.market, es.rawSymbol);
      this.rawSymbolMap.set(rawSymbolKey, es);
      const exSymbolKey = this.genKey(es.ex, es.symbol);
      this.exSymbolMap.set(exSymbolKey, es);
    }
  }

  private genKey(...parts: string[]) {
    return parts.join(':');
  }

  getExchangeSymbolByEMR(ex: string, market: string, rawSymbol: string) {
    const key = this.genKey(ex, market, rawSymbol);
    return this.rawSymbolMap.get(key);
  }

  getExchangeSymbolByES(ex: string, symbol: string) {
    const key = this.genKey(ex, symbol);
    return this.exSymbolMap.get(key);
  }
}
