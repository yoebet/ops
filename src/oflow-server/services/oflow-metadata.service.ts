import { Injectable } from '@nestjs/common';
import { MetaDataRequest } from '../commands';
import { ExchangeConfig } from '@/db/models/exchange-config';
import { SymbolConfig } from '@/db/models/symbol-config';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { TimeLevel } from '@/db/models/time-level';
import { AppLogger } from '@/common/app-logger';
import {
  OflExAccountConfig,
  OflExchange,
} from '@/oflow-server/models-meta/exchanges';
import {
  OflExchangeSymbol,
  OflUnifiedSymbol,
} from '@/oflow-server/models-meta/symbols';
import { OflTimeLevel } from '@/oflow-server/models-meta/time-level';
import { OflCoinConfig } from '@/oflow-server/models-meta/coins';
import { CoinConfig } from '@/db/models/coin-config';
import { ExchangeSymbolEnabled } from '@/db/models/exchange-symbol-enabled';

@Injectable()
export class OflowMetadataService {
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

  constructor(private logger: AppLogger) {
    logger.setContext('oflow-metadata');
  }

  protected async getCoins(params: any): Promise<OflCoinConfig[]> {
    const ccs = await CoinConfig.find({
      order: {
        displayOrder: 'ASC',
      },
    });
    return ccs.map((cc) => {
      return {
        coin: cc.coin,
        volumeSmallMax: cc.volumeSmallMax,
        volumeBigMin: cc.volumeBigMin,
        usdVolumeSmallMax: cc.usdVolumeSmallMax,
        usdVolumeBigMin: cc.usdVolumeBigMin,
      };
    });
  }

  protected async getExchanges(params: any): Promise<OflExchange[]> {
    const result = await ExchangeConfig.find({
      where: { visibleToClient: true },
      order: {
        displayOrder: 'ASC',
      },
    });
    if (!result) {
      return [];
    }
    return result.map((v): OflExchange => {
      return {
        exCode: v.ex,
        name: v.name,
      };
    });
  }

  protected async getExAccounts(params: any): Promise<OflExAccountConfig[]> {
    return [];
  }

  protected async getUnifiedSymbols(params: any): Promise<OflUnifiedSymbol[]> {
    const result = await SymbolConfig.find({
      where: { visibleToClient: true },
      order: {
        displayOrder: 'ASC',
      },
    });
    if (!result) {
      return [];
    }
    return result.map((v): OflUnifiedSymbol => {
      return {
        symbol: v.symbol,
        exMarket: v.market,
        base: v.base,
        quote: v.quote,
        settle: v.settle,
        priceTickStr: v.priceTickStr,
        sizeTicker: v.sizeTicker,
        amountTicker: v.amountTicker,
      };
    });
  }

  protected async getExchangeSymbols(
    params: any,
  ): Promise<OflExchangeSymbol[]> {
    // 不需包含 symbolConfig
    const result = await ExchangeSymbolEnabled.find({
      where: { visibleToClient: true },
    });
    if (!result) {
      return [];
    }
    return result.map((v): OflExchangeSymbol => {
      // const sc = v.symbolConfig;
      return {
        exCode: v.ex,
        exAccountCode: v.exAccount,
        symbol: v.symbol,
        rawSymbol: v.rawSymbol,
        priceTickStr: v.priceTickStr,
        symbolConfig: undefined,
      };
    });
  }

  protected async getTimeLevels(params: any): Promise<OflTimeLevel[]> {
    const result = await TimeLevel.find({
      where: { visibleToClient: true },
      order: {
        intervalSeconds: 'ASC',
      },
    });
    if (!result) {
      return [];
    }
    return result.map((v): OflTimeLevel => {
      return {
        interval: v.interval,
        intervalSeconds: v.intervalSeconds,
        priceRollupFromLevel: v.prlFrom,
        priceRollupToLevel: v.prlTo,
      };
    });
  }
}
