import { Injectable, Type } from '@nestjs/common';
import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';
import {
  MonitorCommand,
  MonitorStreamCommand,
} from '@/exchange/base/ws/ex-ws-monitor-types';
import { ExWsMonitor } from '@/exchange/base/ws/ex-ws-monitor';
import { ExWs, ExWsParams } from '@/exchange/base/ws/ex-ws';
import { ExchangeMarketDataWs } from '@/exchange/exchange-ws-types';

interface WsInst {
  ws: ExchangeMarketDataWs;
  monitor: ExWsMonitor;
}

@Injectable()
export class ExchangeWsService {
  instMap = new Map<string, WsInst>();

  constructor(private logger: AppLogger) {
    logger.setContext('ex-ws-service');
  }

  init(
    instKey: string,
    ExWsType: Type<ExchangeMarketDataWs>,
    args?: ExWsParams,
  ): ExchangeMarketDataWs {
    if (!ExWsType) {
      this.logger.debug(`no ws instance for: ${instKey}`);
      return;
    }
    let wsFacet = this.instMap.get(instKey);
    if (wsFacet) {
      return wsFacet.ws;
    }
    const ws = new ExWsType(args);
    const monitor = new ExWsMonitor(ws as any as ExWs);
    wsFacet = { ws, monitor };
    this.instMap.set(instKey, wsFacet);
    return ws;
  }

  async monitor(instKey: string, cmd: MonitorCommand): Promise<string> {
    const wsFacet = this.instMap.get(instKey);
    if (!wsFacet) {
      return 'not started';
    }
    return wsFacet.monitor.monitor(cmd);
  }

  monitorStream(
    instKey: string,
    cmd: MonitorStreamCommand,
  ): Rx.Observable<string> {
    const wsFacet = this.instMap.get(instKey);
    if (!wsFacet) {
      return Rx.of('not started');
    }
    return wsFacet.monitor.monitorStream(cmd);
  }

  shutdown(): any {
    this.instMap.forEach((facet) => (facet.ws as any as ExWs).shutdown());
  }
}
