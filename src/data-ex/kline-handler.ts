import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { ExSymbolService } from '@/common-services/ex-symbol.service';
import {
  ChannelProducer,
  DataChannelService,
} from '@/data-service/data-channel.service';
import { AppLogger } from '@/common/app-logger';
import { RtKline } from '@/data-service/models/realtime';
import { ExMarket } from '@/db/models/exchange-types';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { UnifiedSymbol } from '@/db/models/unified-symbol';
import { ExWsKline } from '@/exchange/exchange-service.types';

export class KlineHandler {
  private klineProducer: ChannelProducer<RtKline>;

  constructor(
    readonly symbolService: ExSymbolService,
    readonly dataChannelService: DataChannelService,
    readonly publishToChannel: boolean,
    readonly logger: AppLogger,
  ) {}

  receiveWsKlines(
    interval: string,
    klineSubject: SymbolParamSubject<ExWsKline>,
  ): Observable<RtKline> {
    return klineSubject.get().pipe(
      Rx.map((exKl) => {
        const exSymbol = this.symbolService.getExchangeSymbolByEMR(
          exKl.ex,
          ExMarket.spot,
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
          live: exKl.live,
        };
        delete rtKl['rawSymbol'];
        return [rtKl, unifiedSymbol] as [RtKline, UnifiedSymbol];
      }),
      Rx.filter(([rtKl, _unifiedSymbol]) => !!rtKl),
      Rx.tap(async ([rtKl, unifiedSymbol]) => {
        if (!this.publishToChannel) {
          return;
        }
        if (!this.klineProducer) {
          this.klineProducer =
            await this.dataChannelService.getKlineProducer('kline');
        }
        const topic = this.dataChannelService.getKlineTopic(
          unifiedSymbol.base,
          interval,
        );
        await this.klineProducer.produce(topic, rtKl);
      }),
      Rx.map(([rtKl, _unifiedSymbol]) => rtKl),
    );
  }
}
