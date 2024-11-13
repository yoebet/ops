import { ExWs } from '@/exchange/base/ws/ex-ws';
import { ExWsComposite } from '@/exchange/base/ws/ex-ws-composite';
import { MultipleInstanceSubject } from '@/exchange/base/ws/multiple-instance-subject';
import * as Rx from 'rxjs';
import * as _ from 'lodash';
import {
  CmdObserveStatus,
  CmdShowInstances,
  CmdShowStatus,
  MonitorCommand,
  MonitorCommandName,
  MonitorStreamCommand,
  MonitorStreamCommandName,
  WsStatusType,
  SwitchOp,
  WsInstanceFilter,
  BaseStreamCommand,
  CmdShowSymbols,
} from './ex-ws-monitor-types';
import { AppLogger } from '@/common/app-logger';

/**
 * 运行时ws状态监控、管理
 */
export class ExWsMonitor {
  private logger: AppLogger;

  constructor(protected exWs: ExWs) {
    this.logger = this.exWs.logger.subLogger('monitor');
  }

  private showInstances(cmd: CmdShowInstances): string {
    const lines: string[] = [];
    const collectWsInfo = (ws: ExWs, level = 0) => {
      const wsInfo = '  '.repeat(level) + ws.idWithoutEx;
      lines.push(wsInfo);
      if (ws instanceof ExWsComposite) {
        for (const child of ws.getChildInstances()) {
          collectWsInfo(child, level + 1);
        }
      }
    };
    if (this.exWs) {
      collectWsInfo(this.exWs);
    }
    return lines.join('\n');
  }

  private collectInstances(
    instances: ExWs[],
    instanceFilter?: WsInstanceFilter,
  ) {
    const { criteria, leafOnly, forSymbol } = instanceFilter || {};

    const collector = (ws?: ExWs) => {
      if (!ws) {
        return;
      }
      if (ws instanceof MultipleInstanceSubject) {
        if (forSymbol) {
          ws = ws.getInstanceFor(forSymbol);
          if (!ws) {
            return;
          }
        }
      }
      if (ws instanceof ExWsComposite) {
        if (criteria) {
          const wss = ws.findInstances(criteria, {
            leafOnly,
          });
          for (const child of wss) {
            instances.push(child);
          }
        } else {
          instances.push(ws);
        }
      } else {
        instances.push(ws);
      }
    };

    collector(this.exWs);
  }

  private locateInstance(instanceFilter?: WsInstanceFilter): ExWs {
    const instances: ExWs[] = [];
    this.collectInstances(instances, instanceFilter);
    if (instances.length === 0) {
      throw new Error('instance not found.');
    }
    if (instances.length > 1) {
      throw new Error('more than one instance.');
    }
    return instances[0];
  }

  private collectStatus(command: CmdShowStatus | CmdObserveStatus): string {
    const instances: ExWs[] = [];
    this.collectInstances(instances, command);
    if (instances.length === 0) {
      return 'no instance';
    }

    let lines: string[] = [];
    const { type } = command;
    for (const instance of instances) {
      lines.push(`<${instance.idWithoutEx}>`);
      if (!type || type === WsStatusType.connection) {
        lines = lines.concat(instance.collectWsStatus());
      }
      if (!type || type === WsStatusType.connectionSpans) {
        lines = lines.concat(instance.collectConnectionSpans());
      }
      if (!type || type === WsStatusType.subjects) {
        lines = lines.concat(instance.collectSubjectsStatus());
      }
    }
    return lines.join('\n');
  }

  private collectRunningSymbols(command: CmdShowSymbols): string {
    const instances: ExWs[] = [];
    this.collectInstances(instances, { ...command, leafOnly: true });
    if (instances.length === 0) {
      return 'no instance';
    }

    let lines: string[] = [];
    for (const instance of instances) {
      const ss = instance.getRunningSymbols(command.channel);
      lines.push(`=== <${instance.idWithoutEx}> ${ss.length} ===`);
      lines = lines.concat(ss);
    }
    return lines.join('\n');
  }

  async monitor(command: MonitorCommand): Promise<any> {
    const name = command.name;
    this.logger.debug(`${name}`);

    try {
      if (name === MonitorCommandName.showInstances) {
        return this.showInstances(command);
      }
      if (name === MonitorCommandName.showStatus) {
        return this.collectStatus(command);
      }
      if (name === MonitorCommandName.showSymbols) {
        return this.collectRunningSymbols(command);
      }
      if (name === MonitorCommandName.switchLogMessage) {
        const instances: ExWs[] = [];
        this.collectInstances(instances, command);
        if (instances.length === 0) {
          return 'no instance';
        }
        const logMessage = command.op === SwitchOp.on;
        for (const ws of instances) {
          ws.logMessage = logMessage;
        }
        return `logMessage set to ${logMessage}`;
      }
    } catch (e) {
      this.logger.error(e);
      return e.message || 'unknown error.';
    }

    return `unknown command: ${name}`;
  }

  protected truncateStream(
    stream: Rx.Observable<any>,
    streamCommand: BaseStreamCommand,
  ) {
    const { maxTake, maxSeconds } = streamCommand;
    const take = Math.min(maxTake || 100, 3000);
    const time = Math.min(maxSeconds || 100, 30 * 60);
    return stream.pipe(
      Rx.take(take),
      Rx.takeUntil(Rx.timer(time * 1000)),
      Rx.concatWith(Rx.of(`=== ${new Date().toISOString()} ===\ndone.`)),
    );
  }

  monitorStream(command: MonitorStreamCommand): Rx.Observable<any> {
    const name = command.name;
    this.logger.debug(`${name}`);

    try {
      if (name === MonitorStreamCommandName.observeStatus) {
        const interval = Math.max(command.interval || 5000, 500);
        const obs = Rx.interval(interval).pipe(
          Rx.map((n) => {
            const statusText = this.collectStatus(command);
            return `===============
${n}, ${new Date().toISOString()}
${statusText}`;
          }),
        );
        return this.truncateStream(obs, command);
      }

      const pathFilter = (e, path, fValue) => {
        const values = _.at(e, path);
        if (values.length === 0) {
          return false;
        }
        const value = values[0];
        if (fValue == null) {
          return !!value;
        }
        return fValue == value;
      };

      if (name === MonitorStreamCommandName.observeChannel) {
        const ws = this.locateInstance(command);
        const { channel, minInterval, filterPath, filterValue } = command;
        let obs = ws.observable(channel);
        if (!obs) {
          return Rx.of(`no such channel: ${channel}`);
        }
        if (filterPath) {
          obs = obs.pipe(
            Rx.filter((e) => pathFilter(e, filterPath, filterValue)),
          );
        }
        obs = obs.pipe(Rx.throttleTime(Math.max(minInterval || 1000, 100)));
        return this.truncateStream(obs, command);
      }
    } catch (e) {
      this.logger.error(e);
      return Rx.of(`Err: ${e.message}`);
    }

    return Rx.of(`unknown command: ${name}`);
  }
}
