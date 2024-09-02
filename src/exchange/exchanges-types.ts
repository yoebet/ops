import { registerEnumType } from '@nestjs/graphql';
import { TradeSide } from '@/db/models-data/base';

export enum ExchangeCode {
  binance = 'binance',
  okx = 'okx',
  // ftx = 'ftx',
  bitfinex = 'bitfinex',
  coinbase = 'coinbase',
  bybit = 'bybit',
  kucoin = 'kucoin',
  bitmex = 'bitmex',
}

export enum ExAccountCode {
  okxUnified = 'okx-unified',
  binanceSpotMargin = 'binance-spot-margin',
  binanceUsdM = 'binance-usd-m',
  binanceCoinM = 'binance-coin-m',
  bitfinexUnified = 'bitfinex-unified',
  coinbaseUnified = 'coinbase-unified',
  bybitSpot = 'bybit-spot',
  bybitCoinM = 'bybit-coin-m',
  bybitUsdM = 'bybit-usd-m',
  kucoinFutures = 'kucoin-futures',
  kucoinSpot = 'kucoin-spot',
  bitmexUnified = 'bitmex-unified',
}

export enum ExMarket {
  spot = 'spot', //现货

  perp = 'perp', //正向永续
  perp_inverse = 'perp_inv', //反向永续

  future = 'future', //正向交割
  future_inverse = 'future_inv', //反向交割
}

export interface ExTrade {
  ex: ExchangeCode;
  exAccount: ExAccountCode;
  rawSymbol: string; //交易所内的symbol
  tradeId: string;
  price: number;
  size: number; //反向交易对 这里填U金额
  amount?: number;
  side: TradeSide;
  ts: number; // ms
}

// *********** graphql ***********

registerEnumType(ExchangeCode, {
  name: 'ExchangeCode',
  description: '交易所',
});

registerEnumType(ExAccountCode, {
  name: 'ExAccountCode',
  description: '交易账户',
});

registerEnumType(ExMarket, {
  name: 'ExMarket',
  description: '市场',
});
