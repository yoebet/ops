import { Type } from '@nestjs/common';
import { CapableWs } from '@/exchange/ws-capacities';
import { OkxWs } from '@/exchange/okx/okx-ws';
import { BinanceSpotWs } from '@/exchange/binance/binance-spot-ws';
import { ExAccountCode } from '@/exchange/exchanges-types';
import { CapableRest } from '@/exchange/rest-capacities';
import { OkxRest } from '@/exchange/okx/rest';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';

export const ExWsTypes: { [key in ExAccountCode]?: Type<CapableWs> } = {
  [ExAccountCode.okxUnified]: OkxWs,
  [ExAccountCode.binanceSpot]: BinanceSpotWs,
};

export const ExRestTypes: {
  [key in ExAccountCode]?: Type<CapableRest>;
} = {
  [ExAccountCode.okxUnified]: OkxRest,
  [ExAccountCode.binanceSpot]: BinanceSpotRest,
};
