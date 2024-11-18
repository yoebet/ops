import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import {
  ExchangePrivateDataWs,
  SyncOrder,
} from '@/exchange/exchange-service-types';
import { ExApiKey } from '@/exchange/base/rest/rest.type';
import { NoParamSubject } from '@/exchange/base/ws/ex-ws-subjects';
import * as Rx from 'rxjs';
import { ExOrder } from '@/db/models/ex-order';

interface ExOrderWs {
  ws: ExchangePrivateDataWs;
  exSubject?: NoParamSubject<SyncOrder>;
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

  private async saveOrder({
    orderResp,
    rawOrder,
  }: SyncOrder): Promise<ExOrder | undefined> {
    const { exOrderId, clientOrderId } = orderResp;
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
    order.exOrderId = orderResp.exOrderId;
    order.clientOrderId = orderResp.clientOrderId;
    order.status = orderResp.status;
    order.execPrice = orderResp.execPrice;
    order.execSize = orderResp.execSize;
    order.execAmount = orderResp.execAmount;
    order.exCreatedAt = orderResp.exCreatedAt;
    order.exUpdatedAt = orderResp.exUpdatedAt;
    order.rawOrder = rawOrder;

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
    order: { exOrderId?: string; clientOrderId?: string },
  ): Rx.Observable<ExOrder> {
    const subject = new Rx.Subject<ExOrder>();
    this.subscribeExOrder(apiKey, ex, tradeType).then(({ obs, unsubs }) => {
      obs
        .pipe(
          Rx.filter((o) => {
            if (order.clientOrderId) {
              return o.clientOrderId === order.clientOrderId;
            }
            return o.exOrderId === order.exOrderId;
          }),
        )
        .subscribe({
          next: (order) => {
            subject.next(order);
            if (ExOrder.OrderFinished(order)) {
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

  onApplicationShutdown(_signal?: string): any {
    this.logger.warn(`shutdown ...`);
  }
}
