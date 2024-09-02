import * as humanizeDuration from 'humanize-duration';
import * as Rx from 'rxjs';
import * as _ from 'lodash';
import {
  BaseWs,
  BaseExWsParams,
  BaseWsStatusSnapshot,
  WsStatus,
} from '@/exchange/base/ws/base-ws';
import {
  NoParamSubject,
  SymbolParamSubject,
} from '@/exchange/base/ws/ex-ws-subjects';
import { wait } from '@/common/utils/utils';
import { TradeChannelEvent } from '@/exchange/ws-capacities';

const zhDuration = humanizeDuration.humanizer({
  language: 'zh_CN',
  delimiter: ' ',
  spacer: '',
});

export interface ExWsParams extends BaseExWsParams {
  readonly wsBaseUrl?: string;
}

export type WsChannelOp = 'SUBSCRIBE' | 'UNSUBSCRIBE';

// 一个websocket订阅
export interface WsSubscription {
  // ws频道
  channel: string;
  // 交易对（含义可由channel决定）
  symbol?: string;
  options?: Record<string, any>;
}

export type WsSymbolsChanges = {
  readonly added: string[];
  readonly removed: string[];
};

interface SubjectStatus {
  // 创建时间
  createTs: number;
  // 上条消息时间
  lastMessageTs?: number;
  // 消息计数
  messageCounter: number;
}

export interface SubjectSnapshot extends SubjectStatus {
  subjectId: string;
  observersCount: number;
}

export interface WsStatusSnapshot extends BaseWsStatusSnapshot {
  subjectSnapshots: SubjectSnapshot[];
}

export interface ChannelConnectionEvent<M> {
  event: 'open' | 'disconnect';
  // eventTs: number;

  // lastTouchTs?: number;
  lastMessage?: M;

  // resumeTouchTs?: number;
  resumeMessage?: M;
}

// 通过 rxjs发布 ws消息
export abstract class ExWs extends BaseWs {
  // 消息频道
  private readonly subjects = new Map<string, Rx.Subject<any>>();
  // 消息频道状态
  private readonly subjectStatusMap = new Map<string, SubjectStatus>();

  // 已订阅的
  private completedSubscriptions = new Map<string, WsSubscription>();

  // 待订阅的
  private pendingSubscriptions = new Map<string, WsSubscription>();

  private subscriptionChannels = new Set<string>();

  private autoSubscriptOnWsReady = true;

  protected symbolsAwareChannels: string[];

  // 状态
  protected statusSubject = new Rx.BehaviorSubject(this.wsStatus);

  wsBaseUrl?: string;

  // 有订阅时自动 start
  autoStartOnSubscription = true;
  // shutdown时是否停止 subject
  closeSubjectsOnShutdown = true;
  // shutdown时是否清空订阅
  clearSubscriptionsOnShutdown = true;
  // ticker 无更新（tickerTimeoutSeconds秒）自动重连 (tickerSubject)
  reconnectOnTickerTimeout = true;
  tickerTimeoutSeconds = 25;
  tickerSubjectForReconnectCheck?: string;

  protected lastTrade: any;
  protected tradeDisconnectEvent: ChannelConnectionEvent<any>;
  protected tradeChannelEventSubject = new Rx.Subject<
    ChannelConnectionEvent<any>
  >();

  protected constructor(params: ExWsParams) {
    super(params);
    this.wsBaseUrl = params.wsBaseUrl;
  }

  protected checkNeedReconnect(): boolean {
    if (
      !this.reconnectOnTickerTimeout ||
      !this.tickerSubjectForReconnectCheck
    ) {
      return false;
    }
    if (!this.lastConnectTryTs) {
      return false;
    }
    const subjectStatus = this.subjectStatusMap.get(
      this.tickerSubjectForReconnectCheck,
    );
    if (!subjectStatus) {
      return false;
    }
    const { lastMessageTs } = subjectStatus;
    if (!lastMessageTs) {
      return false;
    }
    const thresholdMs = this.tickerTimeoutSeconds * 1000;
    const now = Date.now();
    if (now - this.lastConnectTryTs <= thresholdMs) {
      return false;
    }
    const stale = now - lastMessageTs > thresholdMs;
    if (stale) {
      return this.hasRunningSymbol(this.tickerSubjectForReconnectCheck);
    }
    return false;
  }

  protected statusTransit(to: WsStatus) {
    super.statusTransit(to);
    this.statusSubject.next(to);
  }

  // getWsStatusSubject(): Rx.Observable<WsStatus> {
  //   return this.statusSubject.asObservable();
  // }

  getWsDisconnectSubject(): Rx.Observable<number> {
    return this.statusSubject.pipe(
      Rx.map((s) =>
        s === WsStatus.open ? WsStatus.open : WsStatus.notConnected,
      ),
      Rx.pairwise(),
      Rx.filter(([lastStatus, thisStatus]) => {
        return (
          lastStatus !== thisStatus && thisStatus === WsStatus.notConnected
        );
      }),
      Rx.map(() => 1),
    );
  }

  protected checkTradeConnectionResume(trade: any) {
    if (!this.tradeDisconnectEvent) {
      if (!this.lastTrade) {
        // first connect
        const connectTradeEvent: TradeChannelEvent = {
          event: 'open',
          // eventTs: Date.now(),
          resumeMessage: trade,
        };
        this.tradeChannelEventSubject.next(connectTradeEvent);
      }
      this.lastTrade = trade;
      return;
    }
    const connectTradeEvent: TradeChannelEvent = {
      event: 'open',
      // eventTs: Date.now(),
      // lastTouchTs: this.tradeDisconnectEvent.lastTouchTs,
      lastMessage: this.tradeDisconnectEvent.lastMessage,
      resumeMessage: trade,
    };
    this.lastTrade = trade;
    this.tradeDisconnectEvent = undefined;
    this.tradeChannelEventSubject.next(connectTradeEvent);
  }

  protected getTradeConnectionEvent<M>(): Rx.Observable<
    ChannelConnectionEvent<M>
  > {
    this.getWsDisconnectSubject().subscribe((n) => {
      if (this.tradeDisconnectEvent) {
        return;
      }
      this.tradeDisconnectEvent = {
        event: 'disconnect',
        // eventTs: Date.now(),
        // lastTouchTs: this._lastTouchTs,
        lastMessage: this.lastTrade,
      };
      this.tradeChannelEventSubject.next(this.tradeDisconnectEvent);
    });

    return this.tradeChannelEventSubject.asObservable();
  }

  private ensureSubject(id: string): Rx.Subject<any> {
    let subject = this.subjects.get(id);
    if (!subject) {
      subject = new Rx.Subject();
      this.subjects.set(id, subject);

      const subjectStatus: SubjectStatus = {
        createTs: Date.now(),
        messageCounter: 0,
        // messageItemsCounter: 0,
      };
      this.subjectStatusMap.set(id, subjectStatus);
    }
    return subject;
  }

  observable(id: string): Rx.Observable<any> | undefined {
    return this.subjects.get(id)?.asObservable();
  }

  /**
   * 订阅 channel 消息
   * @param id channel id
   */
  subject(id: string): Rx.Observable<any> {
    return this.ensureSubject(id).asObservable();
  }

  protected publishMessage(subjectId: string, msgObj: any) {
    if (msgObj == null) {
      this.logger.warn('message to publish is null.');
      return;
    }
    this.ensureSubject(subjectId).next(msgObj);
    const subjectStatus = this.subjectStatusMap.get(subjectId)!;
    subjectStatus.messageCounter++;
    subjectStatus.lastMessageTs = Date.now();
  }

  logSubjectsStatus() {
    if (!this.logger) {
      return;
    }
    const lines = this.collectSubjectsStatus();
    this.logger.log(lines.join('\n'));
  }

  logSubjectStatus(subjectId: string) {
    if (!this.logger) {
      return;
    }
    const lines = this.collectSubjectStatus(subjectId);
    this.logger.log(lines.join('\n'));
  }

  collectSubjectsStatus(): string[] {
    let lines: string[] = [];
    lines.push(`--- 频道数: ${this.subjects.size} ---`);
    this.subjects.forEach((subject, subjectId) => {
      lines = lines.concat(this.collectSubjectStatus(subjectId));
    });
    return lines;
  }

  collectSubjectStatus(subjectId: string): string[] {
    const lines: string[] = [];
    lines.push(`--- 频道: ${subjectId}`);
    const subjectStatus = this.subjectStatusMap.get(subjectId)!;
    const { createTs, lastMessageTs, messageCounter } = subjectStatus;

    const durationMs = Date.now() - createTs;
    const duration = zhDuration(durationMs, { round: true });
    lines.push(
      `频道已创建: ${duration}. （自 ${new Date(createTs).toISOString()}）`,
    );
    lines.push(
      `上条消息时间: ${
        lastMessageTs ? new Date(lastMessageTs).toISOString() : 'n/a'
      }`,
    );
    lines.push(`消息条数: ${messageCounter}`);
    if (messageCounter > 0) {
      const msgsPerSec =
        durationMs > 0 ? (messageCounter * 1000) / durationMs : 0;
      let msgsPerSecStr = '';
      if (msgsPerSec > 1) {
        const ns = msgsPerSec.toFixed(msgsPerSec < 10 ? 1 : 0);
        msgsPerSecStr = ` （${ns}条/秒）`;
      }
      const avgIntervalDuration = zhDuration(durationMs / messageCounter, {
        maxDecimalPoints: 4,
      });
      lines.push(`消息平均间隔: ${avgIntervalDuration}.${msgsPerSecStr}`);
    }
    const subject = this.subjects.get(subjectId);
    if (subject) {
      lines.push(`当前订阅: ${subject.observers?.length}`);
    }
    return lines;
  }

  protected getSubjectsSnapshot(): SubjectSnapshot[] {
    const snapshot: SubjectSnapshot[] = [];
    this.subjects.forEach((subject, subjectId) => {
      const subjectStatus = this.subjectStatusMap.get(subjectId)!;
      snapshot.push({
        subjectId,
        observersCount: subject.observers?.length,
        ...subjectStatus,
      });
    });
    return snapshot;
  }

  getWsStatusSnapshot(): WsStatusSnapshot {
    const sn = super.getWsStatusSnapshot() as WsStatusSnapshot;
    sn.subjectSnapshots = this.getSubjectsSnapshot();
    return sn;
  }

  // 通知所有 observers，当前subject已停止（可重新订阅）
  protected closeSubject(subjectId: string, error?: any) {
    const subject = this.subjects.get(subjectId);
    if (!subject) {
      return;
    }
    this.logSubjectStatus(subjectId);
    this.logger.log(`close subject ${subjectId} ...`);
    if (error) {
      subject.error(error);
    } else {
      subject.complete();
    }
    subject.unsubscribe();
    this.subjects.delete(subjectId);
    this.subjectStatusMap.delete(subjectId);
  }

  // 通知所有 observers，当前所有subject已停止（可重新订阅）
  protected closeAllSubjects() {
    this.logSubjectsStatus();
    this.logger.log('close all subjects ...');
    this.subjects.forEach((subject, _subjectId) => {
      subject.complete();
      subject.unsubscribe();
    });
    this.subjects.clear();
    this.subjectStatusMap.clear();
  }

  protected doShutdown() {
    super.doShutdown();
    if (this.closeSubjectsOnShutdown) {
      // 重新start后要重新订阅 Observable
      this.closeAllSubjects();
    }
    if (this.clearSubscriptionsOnShutdown) {
      this.completedSubscriptions.clear();
      this.pendingSubscriptions.clear();
    }
  }

  protected onShutdown() {
    super.onShutdown();
    this.logSubjectsStatus();
  }

  private async _subscribeWsChannel(
    subscriptions: WsSubscription[],
  ): Promise<void> {
    if (subscriptions.length === 0) {
      return;
    }
    this.operateWsChannel('SUBSCRIBE', subscriptions);
    for (const s of subscriptions) {
      const key = this.wsChannelName(s);
      this.completedSubscriptions.set(key, s);
      this.pendingSubscriptions.delete(key);
    }
    if (subscriptions.length <= 3) {
      this.logger.log(
        '已订阅: ' +
          subscriptions.map(this.wsChannelName.bind(this)).join(', '),
      );
    } else {
      this.logger.log(`已订阅: ${subscriptions.length}`);
    }
  }

  protected async subscribeWsChannel(
    subscriptions: WsSubscription[],
  ): Promise<void> {
    await this._subscribeWsChannel(subscriptions);
  }

  protected async subscribeWsChannelChunked(
    ss: WsSubscription[],
    chunkSize: number,
    intervalMs: number,
  ): Promise<void> {
    if (ss.length <= chunkSize) {
      await this._subscribeWsChannel(ss);
      return;
    }
    this.logger.debug(`订阅：${ss.length} ...`);
    const chunks = _.chunk(ss, chunkSize);
    let index = 0;
    for (const subs of chunks) {
      if (index++ > 0 && intervalMs) {
        await wait(intervalMs);
      }
      await this._subscribeWsChannel(subs);
    }
  }

  protected unsubscribeWsChannel(subscriptions: WsSubscription[]): void {
    if (subscriptions.length === 0) {
      return;
    }
    this.operateWsChannel('UNSUBSCRIBE', subscriptions);
    if (subscriptions.length <= 3) {
      this.logger.log(
        '已取消订阅: ' +
          subscriptions.map(this.wsChannelName.bind(this)).join(', '),
      );
    } else {
      this.logger.log(`已取消订阅: ${subscriptions.length}`);
    }
  }

  // 订阅/取消订阅 ws频道
  protected abstract operateWsChannel(
    op: WsChannelOp,
    subscriptions: WsSubscription[],
  ): void;

  // 用作map的key
  protected wsChannelName(s: WsSubscription): string {
    return s.symbol ? `${s.channel}:${s.symbol || ''}` : s.channel;
  }

  private trySubscribe() {
    if (this.pendingSubscriptions.size === 0) {
      return;
    }
    if (!this.wsReady) {
      if (this.autoStartOnSubscription) {
        this.ensureStart().catch((e) => this.logError(e, 'ensureStart'));
      }
      return;
    }
    const subscriptions = Array.from(this.pendingSubscriptions.values());
    // 订阅ws频道，pending -> completed
    this.subscribeWsChannel(subscriptions).catch((e) =>
      this.logError(e, 'subscribeWsChannel'),
    );
  }

  protected async onWsReady(): Promise<void> {
    await super.onWsReady();

    // ws重新连接后全部重新订阅， completed -> pending
    this.completedSubscriptions.forEach((s, key) => {
      this.pendingSubscriptions.set(key, s);
    });
    this.completedSubscriptions.clear();
    if (this.autoSubscriptOnWsReady) {
      this.subscriptionReady();
    }
  }

  // 可以订阅
  protected subscriptionReady(): void {
    this.trySubscribe();
  }

  // 订阅 ws channel
  addWsSubscriptions(subscriptions: WsSubscription[]) {
    for (const s of subscriptions) {
      // 如果未订阅，就加入待订阅
      const key = this.wsChannelName(s);
      if (!this.completedSubscriptions.has(key)) {
        this.pendingSubscriptions.set(key, s);
        this.subscriptionChannels.add(s.channel);
      }
    }
    this.trySubscribe();
  }

  // 取消订阅 ws channel
  removeWsSubscriptions(subscriptions: WsSubscription[]) {
    if (this.wsReady) {
      const subscribed = subscriptions.filter((s) =>
        this.completedSubscriptions.has(this.wsChannelName(s)),
      );
      this.unsubscribeWsChannel(subscribed);
    }
    for (const s of subscriptions) {
      const key = this.wsChannelName(s);
      this.completedSubscriptions.delete(key);
      this.pendingSubscriptions.delete(key);
    }
  }

  addOneWsSubscription(subscription: WsSubscription) {
    this.addWsSubscriptions([subscription]);
  }

  removeOneWsSubscription(subscription: WsSubscription) {
    this.removeWsSubscriptions([subscription]);
  }

  protected toSubscriptions(channel: string, symbols: string[]) {
    const subscriptions: WsSubscription[] = symbols.map((symbol) => {
      return {
        channel,
        symbol,
      };
    });
    return subscriptions;
  }

  // addWsSubscriptions()方法的一个便捷方式
  addSymbolsSubscriptions(channel: string, symbols: string[]) {
    const subscriptions = this.toSubscriptions(channel, symbols);
    this.addWsSubscriptions(subscriptions);
  }

  // removeWsSubscriptions()方法的一个便捷方式
  removeSymbolsSubscriptions(channel: string, symbols: string[]) {
    const subscriptions = this.toSubscriptions(channel, symbols);
    this.removeWsSubscriptions(subscriptions);
  }

  hasChannel(channel: string): boolean {
    return this.subscriptionChannels.has(channel);
  }

  getRunningSymbols(channel?: string): string[] {
    let ss = [...this.completedSubscriptions.values()];
    if (channel) {
      ss = ss.filter((s) => s.channel === channel);
    }
    return ss.map((s) => s.symbol).filter((sym) => sym) as string[];
  }

  hasRunningSymbol(channel?: string): boolean {
    if (!channel) {
      return this.completedSubscriptions.size > 0;
    }
    return [...this.completedSubscriptions.values()].some(
      (s) => s.channel === channel,
    );
  }

  notifySymbolsChanged(changes: WsSymbolsChanges): void {
    if (!this.symbolsAwareChannels) {
      return;
    }
    const { added, removed } = changes;
    for (const channel of this.symbolsAwareChannels) {
      if (!this.hasChannel(channel)) {
        // 没有订阅过这个频道
        continue;
      }
      if (removed.length > 0) {
        this.removeSymbolsSubscriptions(channel, removed);
      }
      if (added.length > 0) {
        this.addSymbolsSubscriptions(channel, added);
      }
    }
  }

  // 订阅时需要指定Symbol
  protected symbolParamSubject<T>(
    channel: string,
    subject?: string,
  ): SymbolParamSubject<T> {
    const ws = this;
    return {
      subs(symbols: string[]) {
        ws.addSymbolsSubscriptions(channel, symbols);
        return this;
      },
      unsubs(symbols: string[]) {
        ws.removeSymbolsSubscriptions(channel, symbols);
        return this;
      },
      get(): Rx.Observable<T> {
        return ws.subject(subject || channel);
      },
    };
  }

  // 订阅时不需要参数
  protected noParamSubject<T>(
    channel: string,
    subject?: string,
  ): NoParamSubject<T> {
    const ws = this;
    return {
      subs() {
        ws.addOneWsSubscription({ channel });
        return this;
      },
      unsubs() {
        ws.removeOneWsSubscription({ channel });
        return this;
      },
      get(): Rx.Observable<T> {
        return ws.subject(subject || channel);
      },
    };
  }

  protected onClose() {
    super.onClose();
    this.logSubjectsStatus();
  }
}
