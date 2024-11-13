import { Type } from '@nestjs/common';
import { OkxWs } from '@/exchange/okx/ws';
import { BinanceSpotWs } from '@/exchange/binance/ws-spot';
import {
  ExchangeCode,
  ExMarket,
  ExTradeType,
} from '@/db/models/exchange-types';
import {
  ExchangeMarketDataService,
  ExchangeTradeService,
} from '@/exchange/exchange-service-types';
import { BinanceTradeSpot } from '@/exchange/binance/binance-trade-spot';
import { BinanceTradeMargin } from '@/exchange/binance/binance-trade-margin';
import { OkxTradeSpot } from '@/exchange/okx/okx-trade-spot';
import { OkxTradeMargin } from '@/exchange/okx/okx-trade-margin';
import { OkxMarketData } from '@/exchange/okx/okx-market-data';
import { BinanceMarketSpot } from '@/exchange/binance/binance-market-spot';
import { ExchangeMarketDataWs } from '@/exchange/exchange-ws-types';

export const ExMarketDataWss: {
  [key in ExchangeCode]: {
    [key in ExMarket]?: Type<ExchangeMarketDataWs>;
  };
} = {
  [ExchangeCode.okx]: {
    [ExMarket.spot]: OkxWs,
  },
  [ExchangeCode.binance]: {
    [ExMarket.spot]: BinanceSpotWs,
  },
};

export const ExTradeServices: {
  [key in ExchangeCode]: {
    [key in ExTradeType]: Type<ExchangeTradeService>;
  };
} = {
  [ExchangeCode.okx]: {
    [ExTradeType.spot]: OkxTradeSpot,
    [ExTradeType.margin]: OkxTradeMargin,
  },
  [ExchangeCode.binance]: {
    [ExTradeType.spot]: BinanceTradeSpot,
    [ExTradeType.margin]: BinanceTradeMargin,
  },
};

export const ExMarketDataServices: {
  [key in ExchangeCode]: {
    [key in ExMarket]?: Type<ExchangeMarketDataService>;
  };
} = {
  [ExchangeCode.okx]: {
    [ExMarket.spot]: OkxMarketData,
  },
  [ExchangeCode.binance]: {
    [ExMarket.spot]: BinanceMarketSpot,
  },
};
