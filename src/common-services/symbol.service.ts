import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@/common/app-logger';
import { ExSymbolEnabled } from '@/db/models/ex-symbol-enabled';
import { ExAccountCode } from '@/exchange/exchanges-types';

@Injectable()
export class SymbolService implements OnModuleInit {
  private exchangeSymbols: ExSymbolEnabled[] = [];
  // exAccount:symbol -> rawSymbol
  private rawSymbolMap = new Map<string, string>();
  // exAccount:rawSymbol -> ExchangeSymbol
  private exchangeSymbolMap = new Map<string, ExSymbolEnabled>(); // with unifiedConfig
  // ex:symbol -> rawSymbol
  private exAccountSymbolMap = new Map<string, ExAccountCode>();

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
    const sc: keyof ExSymbolEnabled = 'unifiedSymbol';
    const ess = await ExSymbolEnabled.find({
      relations: [sc],
    });
    this.exchangeSymbols = ess;

    this.exchangeSymbolMap.clear();
    this.rawSymbolMap.clear();
    for (const es of ess) {
      const rawSymbolKey = this.genExSymbolKey(es.exAccount, es.rawSymbol);
      this.exchangeSymbolMap.set(rawSymbolKey, es);
      const symbolKey = this.genExSymbolKey(es.exAccount, es.symbol);
      this.rawSymbolMap.set(symbolKey, es.rawSymbol);
      const symbolKey2 = this.genExSymbolKey(es.ex, es.symbol);
      this.exAccountSymbolMap.set(symbolKey2, es.exAccount);
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

  getExAccount(ex: string, symbol: string) {
    const symbolKey = this.genExSymbolKey(ex, symbol);
    return this.exAccountSymbolMap.get(symbolKey);
  }
}
