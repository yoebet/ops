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
import { Observable } from 'rxjs';

interface ExPrivateWs {
  ws: ExchangePrivateDataWs;
  orderSubject?: NoParamSubject<SyncOrder>;
  orderObs: {
    [key: string]: { obs: Observable<SyncOrder>; clients: Set<number> };
  };
}

@Injectable()
export class ExPrivateWsService implements OnApplicationShutdown {
  private runningWs = new Map<string, ExPrivateWs>();
  private clientId = 0;

  constructor(
    readonly configService: ConfigService,
    readonly exchangeServices: Exchanges,
    readonly logger: AppLogger,
  ) {
    logger.setContext('ex-private-ws-service');
  }

  private getExPrivateWs(
    apiKey: ExApiKey,
    ex: ExchangeCode,
    tradeType: ExTradeType,
  ): ExPrivateWs {
    const key = `${apiKey.key}:${tradeType}`;
    let privateWs = this.runningWs.get(key);
    if (privateWs) {
      return privateWs;
    }
    const ws = this.exchangeServices.getExPrivateDataWs(apiKey, ex, tradeType);
    privateWs = {
      ws,
      orderSubject: undefined,
      orderObs: {},
    };
    this.runningWs.set(key, privateWs);
    return privateWs;
  }

  async subscribeExOrder(
    apiKey: ExApiKey,
    ex: ExchangeCode,
    tradeType: ExTradeType,
  ): Promise<{ obs: Observable<SyncOrder>; unsubs: () => void }> {
    const pws = this.getExPrivateWs(apiKey, ex, tradeType);

    let orderSubject = pws.orderSubject;
    if (!orderSubject) {
      orderSubject = pws.ws.orderSubject();
      pws.orderSubject = orderSubject;
    }

    const key = `${apiKey.key}-${tradeType}`;
    let keyOrderObs = pws.orderObs[key];
    if (!keyOrderObs) {
      keyOrderObs = {
        obs: orderSubject.get(),
        clients: new Set<number>(),
      };
      pws.orderObs[key] = keyOrderObs;
    }
    const clients = keyOrderObs.clients;
    if (clients.size === 0) {
      orderSubject.subs();
    }
    const clientId = this.clientId++;
    clients.add(clientId);
    return {
      obs: keyOrderObs.obs,
      unsubs: () => {
        clients.delete(clientId);
        if (clients.size === 0) {
          pws.orderSubject.unsubs();
        }
      },
    };
  }

  onApplicationShutdown(_signal?: string): any {
    this.logger.warn(`shutdown ...`);
  }
}
