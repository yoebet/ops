import { Type } from '@nestjs/common';
import { CapableWs } from '@/exchange/ws-types';
import { OkxWs } from '@/exchange/okx/ws';
import { BinanceSpotWs } from '@/exchange/binance/ws-spot';
import { ExAccountCode } from '@/db/models/exchange-types';
import { ExchangeService } from '@/exchange/rest-types';
import { OkxExchange } from '@/exchange/okx/okx-exchange';
import { BinanceSpotMarginExchange } from '@/exchange/binance/spot-margin-exchange';

export const ExWsTypes: { [key in ExAccountCode]?: Type<CapableWs> } = {
  [ExAccountCode.okxUnified]: OkxWs,
  [ExAccountCode.binanceSpot]: BinanceSpotWs,
};

export const ExchangeTypes: {
  [key in ExAccountCode]?: Type<ExchangeService>;
} = {
  [ExAccountCode.okxUnified]: OkxExchange,
  [ExAccountCode.binanceSpot]: BinanceSpotMarginExchange,
};
