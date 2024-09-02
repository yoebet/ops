import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  MonitorCommand,
  MonitorCommandName,
  MonitorStreamCommand,
  MonitorStreamCommandName,
  WsInstanceFilter,
} from '@/exchange/base/ws/ex-ws-monitor-types';
import {
  ExObserveChannelInput,
  ExObserveStatusInput,
  ExWsInstanceSelector,
  ExWsShowInstancesInput,
  ExWsShowStatusInput,
  ExWsShowSymbolsInput,
} from './dto/ex-monitor.input';
import { ExchangeWsService } from '@/exchange/exchange-ws.service';
import { ExAccountCode } from '@/exchange/exchanges-types';

@Injectable()
export class ExMonitorService {
  constructor(
    private exService: ExchangeWsService, // private readonly logger: AppLogger,
  ) {}

  private async execCmd(
    exchange: string,
    cmd: MonitorCommand,
  ): Promise<string> {
    return this.exService.monitor(exchange, cmd);
  }

  private execStreamCmd(
    exchange: ExAccountCode,
    cmd: MonitorStreamCommand,
  ): Observable<string> {
    return this.exService.monitorStream(exchange, cmd);
  }

  private static toWsInstanceFilter(
    selector?: ExWsInstanceSelector,
  ): WsInstanceFilter | undefined {
    if (!selector) {
      return undefined;
    }
    const { leafOnly, ids, category, instanceIndex, forSymbol } = selector;
    return {
      leafOnly,
      forSymbol,
      criteria: {
        ids,
        category,
        instanceIndex,
      },
    };
  }

  async showAllInstances(): Promise<string> {
    const result = [];
    const es = [...this.exService.instMap.entries()];
    for (const [key, { monitor }] of es) {
      const wss = await monitor.monitor({
        name: MonitorCommandName.showInstances,
      });
      result.push(`${key}: ${wss}`);
    }
    return result.join('\n');
  }

  async showWsInstances(input: ExWsShowInstancesInput): Promise<string> {
    const { exchange } = input;
    return this.execCmd(exchange, {
      name: MonitorCommandName.showInstances,
    });
  }

  async showWsStatus(input: ExWsShowStatusInput): Promise<string> {
    const { exchange, wsInstance, type } = input;
    const instanceFilter = ExMonitorService.toWsInstanceFilter(wsInstance);
    const cmd: MonitorCommand = {
      name: MonitorCommandName.showStatus,
      type,
      ...instanceFilter,
    };
    return this.execCmd(exchange, cmd);
  }

  async showWsRunningSymbols(input: ExWsShowSymbolsInput): Promise<string> {
    const { exchange, wsInstance, channel } = input;
    const instanceFilter = ExMonitorService.toWsInstanceFilter(wsInstance);
    const cmd: MonitorCommand = {
      name: MonitorCommandName.showSymbols,
      ...instanceFilter,
      channel,
    };
    return this.execCmd(exchange, cmd);
  }

  observeStatus(input: ExObserveStatusInput): Observable<string> {
    const { exchange, wsInstance, type, interval, maxTake, maxSeconds } = input;
    const instanceFilter = ExMonitorService.toWsInstanceFilter(wsInstance);
    return this.execStreamCmd(exchange, {
      name: MonitorStreamCommandName.observeStatus,
      ...instanceFilter,
      type,
      interval,
      maxTake,
      maxSeconds,
    });
  }

  observeChannel(input: ExObserveChannelInput): Observable<any> {
    const {
      exchange,
      wsInstance,
      channel,
      minInterval,
      maxTake,
      maxSeconds,
      filter,
    } = input;
    const instanceFilter = ExMonitorService.toWsInstanceFilter(wsInstance);
    return this.execStreamCmd(exchange, {
      name: MonitorStreamCommandName.observeChannel,
      ...instanceFilter,
      channel,
      minInterval: minInterval || 1000,
      maxTake,
      maxSeconds,
      filterPath: filter?.path,
      filterValue: filter?.value,
    });
  }
}
