import { Type } from '@nestjs/common';
import { CapableWs } from '@/exchange/ws-capacities';
import { OkxWs } from '@/exchange/okx/okx-ws';
import { BinanceSpotMarginWs } from '@/exchange/binance/binance-spot-margin-ws';
import { BinanceUsdMWs } from '@/exchange/binance/binance-usd-m-ws';
import { BinanceCoinMWs } from '@/exchange/binance/binance-coin-m-ws';
import { ExAccountCode } from '@/exchange/exchanges-types';
import { CoinbaseWsAdvanced } from '@/exchange/coinbase/coinbase-ws-advanced';
import { ByBitLinearWs } from '@/exchange/bybit/bybit-linear-ws';
import { ByBitInverseWs } from '@/exchange/bybit/bybit-inverse-ws';
import { BitfinexWs } from '@/exchange/bitfinex/bitfinex-ws';
import { KuCoinFuturesWs } from '@/exchange/kucoin/kucoin-futures-ws';
import { KuCoinSpotWs } from '@/exchange/kucoin/kucoin-spot-ws';
import { BitMexWs } from '@/exchange/bitmex/bitmex-ws';
import { ExRest } from '@/exchange/base/rest/ex-rest';
import { OkxRest } from '@/exchange/okx/rest';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';
import { BinanceUsdMRest } from '@/exchange/binance/rest-usdsm';
import { BinanceCoinMRest } from '@/exchange/binance/rest-coinm';
import { ByBitSpot } from '@/exchange/bybit/bybit-spot';

export const ExWsTypes: { [key in ExAccountCode]?: Type<CapableWs> } = {
  [ExAccountCode.okxUnified]: OkxWs,
  [ExAccountCode.binanceSpotMargin]: BinanceSpotMarginWs,
  [ExAccountCode.binanceUsdM]: BinanceUsdMWs,
  [ExAccountCode.binanceCoinM]: BinanceCoinMWs,
  [ExAccountCode.coinbaseUnified]: CoinbaseWsAdvanced,
  [ExAccountCode.bybitUsdM]: ByBitLinearWs,
  [ExAccountCode.bybitCoinM]: ByBitInverseWs,
  [ExAccountCode.bybitSpot]: ByBitSpot,
  [ExAccountCode.bitfinexUnified]: BitfinexWs,
  [ExAccountCode.kucoinFutures]: KuCoinFuturesWs,
  [ExAccountCode.kucoinSpot]: KuCoinSpotWs,
  [ExAccountCode.bitmexUnified]: BitMexWs,
};

export const ExRestTypes: { [key in ExAccountCode]?: Type<ExRest> } = {
  [ExAccountCode.okxUnified]: OkxRest,
  [ExAccountCode.binanceSpotMargin]: BinanceSpotRest,
  [ExAccountCode.binanceUsdM]: BinanceUsdMRest,
  [ExAccountCode.binanceCoinM]: BinanceCoinMRest,
};
