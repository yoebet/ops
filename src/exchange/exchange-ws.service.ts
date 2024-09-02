import { Injectable, Type } from '@nestjs/common';
import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';
import {
  MonitorCommand,
  MonitorStreamCommand,
} from '@/exchange/base/ws/ex-ws-monitor-types';
import { CapableWs } from '@/exchange/ws-capacities';
import { ExWsMonitor } from '@/exchange/base/ws/ex-ws-monitor';
import { ExWsParams } from '@/exchange/base/ws/ex-ws';

interface WsInst {
  ws: CapableWs;
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
    ExWsType: Type<CapableWs>,
    args?: ExWsParams,
  ): CapableWs {
    if (!ExWsType) {
      this.logger.debug(`no ws instance for: ${instKey}`);
      return;
    }
    let wsFacet = this.instMap.get(instKey);
    if (wsFacet) {
      return wsFacet.ws;
    }
    const ws = new ExWsType(args);
    const monitor = new ExWsMonitor(ws);
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
    this.instMap.forEach((facet) => facet.ws.shutdown());
  }
}
