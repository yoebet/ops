import { InstanceCriteria } from '@/exchange/base/ws/base-ws';
import { registerEnumType } from '@nestjs/graphql';

export enum SwitchOp {
  on = 'on',
  off = 'off',
}

export enum MonitorCommandName {
  showAllInstances = 'showAllInstances',
  showInstances = 'showInstances',
  showStatus = 'showStatus',
  showSymbols = 'showSymbols',
  switchLogMessage = 'switchLogMessage',
}

export enum MonitorStreamCommandName {
  observeChannel = 'observeChannel',
  observeStatus = 'observeStatus',
}

export enum WsStatusType {
  connection = 'connection',
  connectionSpans = 'connectionSpans',
  subjects = 'subjects',
}

export interface WsInstanceFilter {
  criteria?: InstanceCriteria;
  leafOnly?: boolean;
  forSymbol?: string;
}

export interface CmdShowStatus extends WsInstanceFilter {
  name: MonitorCommandName.showStatus;
  type?: WsStatusType;
}

export interface CmdShowSymbols extends WsInstanceFilter {
  name: MonitorCommandName.showSymbols;
  channel?: string;
}

export interface CmdSwitch extends WsInstanceFilter {
  op: SwitchOp;
}

export interface CmdLogMessage extends CmdSwitch {
  name: MonitorCommandName.switchLogMessage;
}

export interface CmdShowAllInstances {
  name: MonitorCommandName.showAllInstances;
}

export interface CmdShowInstances {
  name: MonitorCommandName.showInstances;
}

export type MonitorCommand =
  | CmdShowAllInstances
  | CmdShowInstances
  | CmdShowStatus
  | CmdShowSymbols
  | CmdLogMessage;

export interface StreamLimit {
  maxTake?: number;
  maxSeconds?: number;
}

export interface BaseStreamCommand extends WsInstanceFilter, StreamLimit {}

export interface CmdObserveStatus extends BaseStreamCommand {
  name: MonitorStreamCommandName.observeStatus;
  type?: WsStatusType;
  interval?: number;
}

export interface CmdObserveChannel extends BaseStreamCommand {
  name: MonitorStreamCommandName.observeChannel;
  channel: string;
  minInterval?: number;
  filterPath?: string;
  filterValue?: string;
}

export type MonitorStreamCommand = CmdObserveStatus | CmdObserveChannel;

registerEnumType(MonitorCommandName, {
  name: 'ExMonitorCommandName',
  description: 'ws监控命令',
});

registerEnumType(WsStatusType, {
  name: 'WsStatusType',
  description: 'ws 状态类型',
});

registerEnumType(SwitchOp, {
  name: 'SwitchOp',
  description: '开关',
});
