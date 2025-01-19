import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Rx from 'rxjs';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { ExchangePrivateDataWs } from '@/exchange/exchange-service.types';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { NoParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import { ExOrder, ExOrderResp, OrderIds } from '@/db/models/ex-order';
import { wait } from '@/common/utils/utils';

interface ExOrderWs {
  ws: ExchangePrivateDataWs;
  exSubject?: NoParamSubject<ExOrderResp>;
  obs: Rx.Observable<ExOrder>;
  clients: Set<number>;
}

@Injectable()
export class ExPrivateWsService implements OnApplicationShutdown {
  private runningOrderWs = new Map<string, ExOrderWs>();
  private clientId = 0;

  constructor(
    readonly configService: ConfigService,
    readonly exchangeServices: Exchanges,
    readonly logger: AppLogger,
  ) {
    logger.setContext('ex-private-ws-service');
  }

  private async saveOrder(res: ExOrderResp): Promise<ExOrder | undefined> {
    const { exOrderId, clientOrderId } = res;
    let order: ExOrder;
    if (clientOrderId) {
      order = await ExOrder.findOneBy({ clientOrderId });
    } else {
      order = await ExOrder.findOneBy({ exOrderId });
    }
    if (!order) {
      // UserExAccount
      return undefined;
    }
    ExOrder.setProps(order, res);

    await order.save();
    return order;
  }

  async subscribeExOrder(
    apiKey: ExApiKey,
    ex: ExchangeCode,
    tradeType: ExTradeType,
  ): Promise<{ obs: Rx.Observable<ExOrder>; unsubs: () => void }> {
    const key = `${apiKey.key}:${tradeType}`;
    let pws = this.runningOrderWs.get(key);
    if (!pws) {
      const ws = this.exchangeServices.getExPrivateDataWs(
        apiKey,
        ex,
        tradeType,
      );
      const subject = new Rx.Subject<ExOrder>();
      ws.orderSubject()
        .get()
        .subscribe({
          next: async (so) => {
            const exo = await this.saveOrder(so);
            if (exo) {
              subject.next(exo);
            }
          },
          error: subject.error,
          complete: subject.complete,
        });
      pws = {
        ws,
        exSubject: ws.orderSubject(),
        obs: subject.asObservable(),
        clients: new Set<number>(),
      };
      this.runningOrderWs.set(key, pws);
    }

    const { clients, exSubject, obs } = pws;
    if (clients.size === 0) {
      exSubject.subs();
    }
    const clientId = this.clientId++;
    clients.add(clientId);
    return {
      obs,
      unsubs: () => {
        clients.delete(clientId);
        if (clients.size === 0) {
          exSubject.unsubs();
        }
      },
    };
  }

  subscribeForOrder(
    apiKey: ExApiKey,
    ex: ExchangeCode,
    tradeType: ExTradeType,
    ids: OrderIds,
  ): Rx.Observable<ExOrder> {
    const subject = new Rx.Subject<ExOrder>();
    this.subscribeExOrder(apiKey, ex, tradeType).then(({ obs, unsubs }) => {
      obs
        .pipe(
          Rx.filter((o) => {
            if (ids.clientOrderId) {
              return o.clientOrderId === ids.clientOrderId;
            }
            return o.exOrderId === ids.exOrderId;
          }),
        )
        .subscribe({
          next: (order) => {
            subject.next(order);
            if (ExOrder.orderFinished(order.status)) {
              subject.complete();
              unsubs();
            }
          },
          error: subject.error,
          complete: subject.complete,
        });
    });
    return subject.asObservable();
  }

  async waitForOrder(
    apiKey: ExApiKey,
    ex: ExchangeCode,
    tradeType: ExTradeType,
    ids: OrderIds,
    timeoutSeconds?: number,
  ): Promise<ExOrder | undefined> {
    const obs = this.subscribeForOrder(apiKey, ex, tradeType, ids);
    const $last = Rx.lastValueFrom(obs).catch((e) => {
      this.logger.error(e);
      return undefined;
    });
    if (!timeoutSeconds) {
      return $last;
    }
    return await Promise.race([
      $last,
      wait(timeoutSeconds * 1000).then(() => undefined),
    ]);
  }

  onApplicationShutdown(_signal?: string): any {
    this.logger.warn(`shutdown ...`);
  }
}
