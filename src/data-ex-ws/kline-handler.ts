import { SymbolService } from '@/common-services/symbol.service';
import {
  ChannelProducer,
  DataChannelService,
} from '@/data-service/data-channel.service';
import { AppLogger } from '@/common/app-logger';
import { ExAccountWs } from '@/data-ex-ws/ex-ws.service';
import { RtKline } from '@/data-service/models/realtime';
import { ExKlineWithSymbol } from '@/exchange/exchanges-types';

export class KlineHandler {
  private klineProducer: ChannelProducer<RtKline>;

  constructor(
    readonly symbolService: SymbolService,
    readonly dataChannelService: DataChannelService,
    readonly logger: AppLogger,
  ) {}

  receiveWsKlines(exAccountWs: ExAccountWs, interval: string) {
    const { exAccount, ws, rawSymbols } = exAccountWs;

    ws.klineSubject(interval)
      .subs(rawSymbols)
      .get()
      .subscribe(async (exKl: ExKlineWithSymbol) => {
        const exSymbol = this.symbolService.getExchangeSymbol(
          exAccount,
          exKl.rawSymbol,
        );
        if (!exSymbol || !exSymbol.unifiedSymbol) {
          return undefined;
        }
        const unifiedSymbol = exSymbol.unifiedSymbol;
        const rtKl: RtKline = {
          ...exKl,
          interval,
          ex: exSymbol.ex,
          symbol: unifiedSymbol.symbol,
        };
        delete rtKl['rawSymbol'];

        if (!this.klineProducer) {
          this.klineProducer =
            await this.dataChannelService.getKlineProducer('kline');
        }
        const topic = this.dataChannelService.getKlineTopic(
          unifiedSymbol.base,
          interval,
        );
        await this.klineProducer.produce(topic, rtKl);
      });
  }
}
