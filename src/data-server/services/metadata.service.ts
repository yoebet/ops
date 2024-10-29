import { Injectable } from '@nestjs/common';
import { MetaDataRequest } from '../commands';
import { ExchangeConfig } from '@/db/models/exchange-config';
import { UnifiedSymbol } from '@/db/models/unified-symbol';
import { TimeLevel } from '@/db/models/time-level';
import { AppLogger } from '@/common/app-logger';
import {
  OflExAccountConfig,
  OflExchange,
} from '@/data-server/models-meta/exchanges';
import {
  OflExchangeSymbol,
  OflUnifiedSymbol,
} from '@/data-server/models-meta/symbols';
import { OflTimeLevel } from '@/data-server/models-meta/time-level';
import { OflCoinConfig } from '@/data-server/models-meta/coins';
import { CoinConfig } from '@/db/models/coin-config';
import { ExSymbolEnabled } from '@/db/models/ex-symbol-enabled';

@Injectable()
export class MetadataService {
  constructor(private logger: AppLogger) {
    logger.setContext('metadata');
  }

  async getMetaData(req: MetaDataRequest): Promise<any[]> {
    const { type, params } = req;
    switch (type) {
      case 'coins':
        return this.getCoins(params);
      case 'exchanges':
        return this.getExchanges(params);
      case 'exAccounts':
        return this.getExAccounts(params);
      case 'symbols':
        return this.getUnifiedSymbols(params);
      case 'exSymbols':
        return this.getExchangeSymbols(params);
      case 'intervals':
        return this.getTimeLevels(params);
      case 'time':
        return [Date.now()];
    }
    return [];
  }

  protected async getCoins(_params: any): Promise<OflCoinConfig[]> {
    const ccs = await CoinConfig.find({
      order: {
        displayOrder: 'ASC',
      },
    });
    return ccs.map((cc) => {
      return {
        coin: cc.coin,
      };
    });
  }

  protected async getExchanges(_params: any): Promise<OflExchange[]> {
    const result = await ExchangeConfig.find({
      order: {
        displayOrder: 'ASC',
      },
    });
    return result.map((v): OflExchange => {
      return {
        ex: v.ex,
        name: v.name,
      };
    });
  }

  protected async getExAccounts(_params: any): Promise<OflExAccountConfig[]> {
    return [];
  }

  protected async getUnifiedSymbols(_params: any): Promise<OflUnifiedSymbol[]> {
    const result = await UnifiedSymbol.find({
      where: { enabled: true },
    });
    return result.map((v): OflUnifiedSymbol => {
      return {
        symbol: v.symbol,
        market: v.market,
        base: v.base,
        quote: v.quote,
        settle: v.settle,
      };
    });
  }

  protected async getExchangeSymbols(
    _params: any,
  ): Promise<OflExchangeSymbol[]> {
    // 不需包含 unifiedConfig
    const result = await ExSymbolEnabled.find({});
    return result.map((v): OflExchangeSymbol => {
      return {
        ex: v.ex,
        market: v.market,
        symbol: v.symbol,
        rawSymbol: v.rawSymbol,
        unifiedConfig: undefined,
      };
    });
  }

  protected async getTimeLevels(_params: any): Promise<OflTimeLevel[]> {
    const result = await TimeLevel.find({
      order: {
        intervalSeconds: 'ASC',
      },
    });
    return result.map((v): OflTimeLevel => {
      return {
        interval: v.interval,
        intervalSeconds: v.intervalSeconds,
      };
    });
  }
}
