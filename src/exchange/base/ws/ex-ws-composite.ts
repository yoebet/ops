import {
  ExWs,
  ExWsParams,
  WsChannelOp,
  WsStatusSnapshot,
  WsSubscription,
  WsSymbolsChanges,
} from '@/exchange/base/ws/ex-ws';
import { InstanceCriteria } from '@/exchange/base/ws/base-ws';

// 组合多个 ExWs实例；本身不连接 websocket
export abstract class ExWsComposite extends ExWs {
  protected wss: ExWs[] = [];

  protected constructor(params: ExWsParams) {
    super(params);
  }

  protected async address(): Promise<string | URL> {
    return '';
  }

  protected operateWsChannel(
    _op: WsChannelOp,
    _subscriptions: WsSubscription[],
  ) {
    //
  }

  get wsReady(): boolean {
    if (this.wss.length === 0) {
      return false;
    }
    return this.wss.every((ws) => ws.wsReady);
  }

  get wsShutdown(): boolean {
    return this.wss.every((ws) => ws.wsShutdown);
  }

  set logMessage(value: boolean) {
    super.logMessage = value;
    for (const ws of this.wss) {
      ws.logMessage = value;
    }
  }

  set candleIncludeLive(value: boolean) {
    super.candleIncludeLive = value;
    for (const ws of this.wss) {
      ws.candleIncludeLive = value;
    }
  }

  protected add(ws: ExWs) {
    if (!this.wss.includes(ws)) {
      this.wss.push(ws);
      ws.logMessage = this.logMessage;
    }
  }

  protected remove(ws: ExWs) {
    this.wss = this.wss.filter((w) => w !== ws);
  }

  async start(): Promise<void> {
    for (const ws of this.wss) {
      await ws.start();
    }
  }

  shutdown() {
    for (const ws of this.wss) {
      ws.shutdown();
    }
  }

  logWsStatus() {
    for (const ws of this.wss) {
      ws.logWsStatus();
    }
  }

  logSubjectsStatus() {
    for (const ws of this.wss) {
      ws.logSubjectsStatus();
    }
  }

  logConnectionSpans() {
    for (const ws of this.wss) {
      ws.logConnectionSpans();
    }
  }

  getWsStatusSnapshot(): WsStatusSnapshot {
    // TODO:
    return {} as WsStatusSnapshot;
  }

  collectWsStatus(): string[] {
    let lines: string[] = [];
    for (const ws of this.wss) {
      lines.push(`<${ws.idWithoutEx}>`);
      lines = lines.concat(ws.collectWsStatus());
    }
    return lines;
  }

  collectConnectionSpans(): string[] {
    let lines: string[] = [];
    for (const ws of this.wss) {
      lines.push(`<${ws.idWithoutEx}>`);
      lines = lines.concat(ws.collectConnectionSpans());
    }
    return lines;
  }

  collectSubjectsStatus(): string[] {
    let lines: string[] = [];
    for (const ws of this.wss) {
      lines.push(`<${ws.idWithoutEx}>`);
      lines = lines.concat(ws.collectSubjectsStatus());
    }
    return lines;
  }

  addSymbolsSubscriptions(_channel: string, _symbols: string[]) {
    //
  }

  addWsSubscriptions(_subscriptions: WsSubscription[]) {
    //
  }

  addOneWsSubscription(_subscription: WsSubscription) {
    //
  }

  removeSymbolsSubscriptions(_channel: string, _symbols: string[]) {
    //
  }

  removeWsSubscriptions(_subscriptions: WsSubscription[]) {
    //
  }

  removeOneWsSubscription(_subscription: WsSubscription) {
    //
  }

  notifySymbolsChanged(changes: WsSymbolsChanges) {
    for (const ws of this.wss) {
      ws.notifySymbolsChanged(changes);
    }
  }

  getChildInstances(): ExWs[] {
    return this.wss;
  }

  findInstances(
    criteria: InstanceCriteria,
    options?: { leafOnly?: boolean },
  ): ExWs[] {
    const instances: ExWs[] = [];
    for (const ws of this.wss) {
      if (ws instanceof ExWsComposite) {
        if (!options?.leafOnly) {
          if (ws.match(criteria)) {
            instances.push(ws);
            continue;
          }
        }
        const lfs = ws.findInstances(criteria);
        for (const lf of lfs) {
          instances.push(lf);
        }
      } else {
        if (ws.match(criteria)) {
          instances.push(ws);
        }
      }
    }
    return instances;
  }
}
