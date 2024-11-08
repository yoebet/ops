import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { SymbolService } from '@/common-services/symbol.service';
import {
  ChannelProducer,
  DataChannelService,
} from '@/data-service/data-channel.service';
import { AppLogger } from '@/common/app-logger';
import { RtKline } from '@/data-service/models/realtime';
import { ExAccountCode, ExKlineWithSymbol } from '@/exchange/exchanges-types';
import { SymbolParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { UnifiedSymbol } from '@/db/models/unified-symbol';

export class KlineHandler {
  private klineProducer: ChannelProducer<RtKline>;

  constructor(
    readonly symbolService: SymbolService,
    readonly dataChannelService: DataChannelService,
    readonly publishToChannel: boolean,
    readonly logger: AppLogger,
  ) {}

  receiveWsKlines(
    exAccount: ExAccountCode,
    interval: string,
    klineSubject: SymbolParamSubject<ExKlineWithSymbol>,
  ): Observable<RtKline> {
    return klineSubject.get().pipe(
      Rx.map((exKl) => {
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
