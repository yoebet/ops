import { Agent, ClientRequestArgs } from 'http';
import { ClientOptions, RawData, WebSocket } from 'ws';
import * as humanizeDuration from 'humanize-duration';
import * as prettyBytes from 'pretty-bytes';
import { URL } from 'url';
import * as _ from 'lodash';
import { wait } from '@/common/utils/utils';
import { AppLogger } from '@/common/app-logger';

const zhDuration = humanizeDuration.humanizer({
  language: 'zh_CN',
  delimiter: ' ',
  spacer: '',
});

export interface IdComponents {
  entityCode?: string;
  category?: string;
  instanceIndex?: number;
}

export interface InstanceCriteria {
  ids?: string; // idWithoutEx
  entityCode?: string;
  category?: string;
  instanceIndex?: number;
}

export function mergeId(
  defaults: IdComponents,
  params?: Partial<BaseExWsParams>,
): BaseExWsParams {
  return _.merge(
    {
      idComponents: defaults,
    },
    params,
  );
}

export interface BaseExWsParams {
  readonly idComponents: IdComponents;
  readonly agent?: Agent;
  readonly logger?: AppLogger;
}

export interface ConnectionSpan {
  startTs: number;
  endTs?: number;
  spanMs?: number;
}

export enum WsStatus {
  notConnected = 'not-connected', // 未连接
  connecting = 'connecting', // 连接中
  open = 'open', // 已连接
  unexpectedClosed = 'unexpected-closed', // 重连接的关闭或非预期关闭
  shuttingDown = 'shutting-down', // 主动关闭中
  shutdown = 'shutdown', // 主动关闭（不会自动重连）
}

export interface BaseWsStatusSnapshot {
  id: IdComponents;
  wsStatus: WsStatus;
  firstConnectTryTs: number | undefined;
  firstConnectOpenTs: number | undefined;
  connectCloseCounter: number;
  lastConnectOpenTs: number | undefined;
  lastTouchTs: number | undefined;
  sentMessageCounter: number;
  receivedMessageCounter: number;
  receivedMessageTextLength: number;
  // connectionSpans: ConnectionSpan[];
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

const KEEP_CONNECTION_SPANS_COUNT = 5;

const SHUTDOWN_TIMOUT = 3 * SECOND_MS;

// 基类只负责连接管理
export abstract class BaseWs {
  readonly idComponents: IdComponents;
  readonly idWithoutEx: string;
  readonly options: ClientOptions | ClientRequestArgs;
  readonly agent?: Agent;
  readonly logger: AppLogger;
  readonly loggerContext: string;

  protected pingInterval: number;
  protected lastTouchTimeout: number;
  protected reconnectMinInterval: number;
  protected healthCheckInterval: number;

  private reconnectOptions = {
    firstDelay: 1000,
    maxDelay: 120_000, // 2m
    delayExponent: 2, // 1, 2, 4, 8, 16, 32, 64
  };

  // 连接重试的额外延迟（reconnectInterval之外）
  private reconnectDelay = 0;

  // 运行时调试开关
  private _logMessage = false;
  private _logErrorStack = false;

  private _ws?: WebSocket;

  protected _lastTouchTs?: number;
  // 主动 ping或收到服务器 ping的时间戳
  private _lastPingTs?: number;

  // ws状态
  protected wsStatus = WsStatus.notConnected;
  // 连接尝试
  private _connectTryCounter = 0;
  private _firstConnectTryTs?: number;
  private _lastConnectTryTs?: number;

  // 连接成功
  private _connectOpenCounter = 0;
  private _firstConnectOpenTs?: number;
  private _lastConnectOpenTs?: number;

  // 连接关闭
  private _connectCloseCounter = 0;

  private _connectionSpans: ConnectionSpan[] = [];

  // 收到的消息计数
  private _receivedMessageCounter = 0;
  // 收到的消息长度累计（如果消息已压缩，解压后再计）
  private _receivedMessageTextLength = 0;
  // 发送的消息计数
  private _sentMessageCounter = 0;

  // 发送的消息计数（不会 reset）
  private _accumulatedSentMessageCounter = 0;

  protected constructor(params: BaseExWsParams) {
    this.pingInterval = 10 * SECOND_MS;
    this.lastTouchTimeout = MINUTE_MS;
    this.reconnectMinInterval = 10 * SECOND_MS;
    this.healthCheckInterval = 6 * SECOND_MS;
    this.agent = params.agent;

    this.idComponents = params.idComponents;
    if (!this.idComponents.entityCode) {
      this.idComponents.entityCode = this.constructor.name;
    }
    this.idWithoutEx = this.buildIdWithoutEx();
    const entityCode = this.idComponents.entityCode;
    this.loggerContext = `${entityCode}:${this.idWithoutEx}`;
    this.logger = AppLogger.from(params.logger, this.loggerContext);

    this.options = _.mergeWith({
      perMessageDeflate: false,
      handshakeTimeout: 60 * SECOND_MS,
      agent: this.agent,
    } as ClientOptions | ClientRequestArgs);
  }

  protected categoryAndIndex(): string[] {
    const { category, instanceIndex } = this.idComponents;
    const parts: string[] = [];
    if (category) {
      parts.push(category);
    }
    if (instanceIndex != null) {
      parts.push('' + instanceIndex);
    }
    return parts;
  }

  protected buildIdWithoutEx() {
    const parts: string[] = ['ws'];
    return parts.concat(this.categoryAndIndex()).join(':');
  }

  match(criteria: InstanceCriteria): boolean {
    const idc = this.idComponents;
    const { ids, entityCode, category, instanceIndex } = criteria;
    if (entityCode && entityCode !== idc.entityCode) {
      return false;
    }
    if (ids && ids !== this.idWithoutEx) {
      return false;
    }
    if (category && category !== idc.category) {
      return false;
    }
    return !(instanceIndex != null && instanceIndex !== idc.instanceIndex);
  }

  get wsReady(): boolean {
    return this._ws != null && this.wsStatus === WsStatus.open;
  }

  get wsShutdown(): boolean {
    return this.wsStatus === WsStatus.shutdown;
  }

  // never reset
  get accumulatedSentMessageCounter(): number {
    return this._accumulatedSentMessageCounter;
  }

  get logMessage(): boolean {
    return this._logMessage;
  }

  set logMessage(value: boolean) {
    this._logMessage = value;
  }

  get lastConnectTryTs(): number | undefined {
    return this._lastConnectTryTs;
  }

  protected resetCounters() {
    this.logger.log(`计数重置`);
    this._connectTryCounter = 0;
    this._firstConnectTryTs = undefined;
    this._connectOpenCounter = 0;
    this._firstConnectOpenTs = undefined;
    this._connectCloseCounter = 0;
    this._connectionSpans = [];
    this._receivedMessageCounter = 0;
    this._receivedMessageTextLength = 0;
    this._sentMessageCounter = 0;
  }

  protected statusTransit(to: WsStatus) {
    const from = this.wsStatus;
    this.wsStatus = to;
    this.logger.debug(`${from} -> ${to}`);
  }

  protected logError(err: any, context?: string): void {
    if (context) {
      this.logger.setContext(`${this.loggerContext}:${context}`);
    }
    try {
      if (err instanceof Error) {
        if (this._logErrorStack) {
          this.logger.error(err);
        } else {
          this.logger.error(err?.message);
        }
      } else if (typeof err === 'object') {
        this.logger.error(err);
      } else {
        const msg = err?.message || err?.toString() || 'Err.';
        this.logger.error(msg);
      }
    } finally {
      if (context) {
        this.logger.resetContext();
      }
    }
  }

  protected async onMessageObj(_obj: any): Promise<void> {
    this.logError('未覆盖方法onMessageObj');
  }

  // 如果覆盖此方法而不调super，要增加计数。 _receivedMessageLength记的是文本长度
  // 如果消息是压缩的，解压缩并构成文本后再增加长度计数
  protected async onMessage(data: RawData): Promise<void> {
    const str = String(data);
    this._receivedMessageCounter++;
    this._receivedMessageTextLength += str.length;
    if (str === 'ping') {
      if (this._logMessage) {
        this.logger.log('got ping -');
      }
      this.gotHeartbeat();
      this.send('pong');
      return;
    }
    if (str === 'pong') {
      if (this._logMessage) {
        this.logger.log('got pong -');
      }
      return;
    }
    let obj;
    try {
      obj = JSON.parse(str);
    } catch (e) {
      this.logError(e);
      this.logger.warn(`解析JSON出错: ${str}`);
      return;
    }
    if (this._logMessage) {
      this.logger.log(JSON.stringify(obj, null, 2));
    }
    await this.onMessageObj(obj);
  }

  protected healthCheckerHandler?: any;

  private keepHeartbeat() {
    if (!this.wsReady) {
      return;
    }
    if (
      !this._lastPingTs ||
      Date.now() - this._lastPingTs >= this.pingInterval
    ) {
      try {
        this.heartbeat();
        this._lastPingTs = Date.now();
      } catch (e) {
        this.logger.error(e, '主动 Ping 失败');
      }
    }
  }

  private async healthCheck() {
    if (
      this.wsStatus === WsStatus.shutdown ||
      this.wsStatus === WsStatus.shuttingDown
    ) {
      // 是主动关闭
      return;
    }

    this.keepHeartbeat();

    const ts = Date.now();
    const closed = this.wsStatus === WsStatus.unexpectedClosed;
    if (
      closed ||
      !this._lastTouchTs ||
      ts - this._lastTouchTs > this.lastTouchTimeout
    ) {
      if (!this._lastConnectTryTs) {
        await this.reconnect();
        return;
      }
      try {
        this.tryNotifyDisconnected();

        // interval（连接间隔） = 最小间隔 + 额外延迟
        const interval = this.reconnectMinInterval + this.reconnectDelay;
        if (ts - this._lastConnectTryTs >= interval) {
          const reason = closed ? '检测到断开' : '超时未收到消息';
          this.logger.log(`${reason}，重新连接 WebSocket...`);
          await this.reconnect();

          // 计数下次延迟
          const { firstDelay, maxDelay, delayExponent } = this.reconnectOptions;
          let delay = this.reconnectDelay;
          if (delay === 0) {
            delay = firstDelay;
          } else {
            delay *= delayExponent;
            if (delay > maxDelay) {
              delay = maxDelay;
            }
          }
          this.reconnectDelay = delay;

          return;
        }
      } catch (e) {
        this.logger.error('连接 WebSocket 失败: ' + e?.message);
      }
    }

    if (this.checkNeedReconnect()) {
      this.logger.log(`要求重连接 ...`);
      await this.reconnect();
    }
  }

  protected checkNeedReconnect(): boolean {
    return false;
  }

  private tryNotifyDisconnected() {
    //
  }

  async reconnect(): Promise<void> {
    if (this._ws) {
      this.disconnectWs();
      await wait(1000);
    }
    await this.connectWs();
  }

  collectWsStatus(): string[] {
    const lines: string[] = [];
    lines.push(`--- ws 连接状态 ---`);
    lines.push(`状态: ${this.wsStatus}`);
    if (this._firstConnectTryTs) {
      lines.push(
        `初次连接尝试: ${new Date(this._firstConnectTryTs).toISOString()}`,
      );
    }
    if (this._firstConnectOpenTs) {
      lines.push(
        `初次连接成功: ${new Date(this._firstConnectOpenTs).toISOString()}`,
      );
    }
    if (this._connectCloseCounter > 0) {
      lines.push(`连接已断开 ${this._connectCloseCounter} 次`);
    }
    if (this.wsStatus === WsStatus.open && this._lastConnectOpenTs) {
      lines.push(`当前是第 ${this._connectOpenCounter} 次成功连接`);
      const ms = Date.now() - this._lastConnectOpenTs;
      const duration = zhDuration(ms, { round: true });
      lines.push(
        `当前连接已运行 ${duration}. （自 ${new Date(
          this._lastConnectOpenTs,
        ).toISOString()}）`,
      );
    }
    lines.push(
      `上次 touch: ${
        this._lastTouchTs ? new Date(this._lastTouchTs).toISOString() : 'n/a'
      }`,
    );
    lines.push(
      `已发送消息数: ${this._sentMessageCounter}, 已接收消息数: ${this._receivedMessageCounter}`,
    );
    if (this._receivedMessageCounter > 0) {
      const textLength = prettyBytes(this._receivedMessageTextLength, {
        binary: true,
      });
      const avgLen = prettyBytes(
        this._receivedMessageTextLength / this._receivedMessageCounter,
        {
          binary: true,
        },
      );
      lines.push(`已接收消息: ${textLength}, 平均消息长度: ${avgLen}`);
    }

    return lines;
  }

  logWsStatus() {
    if (!this.logger) {
      return;
    }
    const lines = this.collectWsStatus();
    this.logger.log(lines.join('\n'));
  }

  collectConnectionSpans(): string[] {
    const lines: string[] = [];
    const spans = this._connectionSpans;
    lines.push(`--- 连接记录 ${this._connectOpenCounter} ---`);
    const removed = this._connectOpenCounter - spans.length;
    if (removed > 0) {
      lines.push(`...`);
    }
    for (let i = 0; i < spans.length; i++) {
      const index = i + 1 + removed;
      const { startTs, endTs, spanMs } = spans[i];
      const start = new Date(startTs).toISOString();
      if (endTs && spanMs) {
        const end = new Date(endTs).toISOString();
        const duration = zhDuration(spanMs, { round: true });
        lines.push(`${index}:  ${start} <-> ${end} (${duration})`);
      } else {
        lines.push(`${index}:  ${start} <->`);
      }
    }
    return lines;
  }

  logConnectionSpans() {
    if (!this.logger) {
      return;
    }
    const lines = this.collectConnectionSpans();
    this.logger.log(lines.join('\n'));
  }

  getWsStatusSnapshot(): BaseWsStatusSnapshot {
    return {
      id: this.idComponents,
      wsStatus: this.wsStatus,
      firstConnectTryTs: this._firstConnectTryTs,
      firstConnectOpenTs: this._firstConnectOpenTs,
      connectCloseCounter: this._connectCloseCounter,
      lastConnectOpenTs: this._lastConnectOpenTs,
      lastTouchTs: this._lastTouchTs,
      sentMessageCounter: this._sentMessageCounter,
      receivedMessageCounter: this._receivedMessageCounter,
      receivedMessageTextLength: this._receivedMessageTextLength,
      // connectionSpans: _.cloneDeep(this._connectionSpans),
    };
  }

  private ensureHealthChecker() {
    if (this.healthCheckerHandler) {
      return;
    }
    this.healthCheckerHandler = setInterval(() => {
      this.healthCheck().catch((e) => {
        this.logError(e, 'healthCheck');
      });
    }, this.healthCheckInterval);
  }

  private clearHealthChecker() {
    if (this.healthCheckerHandler) {
      clearInterval(this.healthCheckerHandler);
      this.healthCheckerHandler = undefined;
    }
  }

  /**
   * 开始服务
   */
  async start(): Promise<void> {
    if (this.wsStatus === WsStatus.connecting) {
      return;
    }
    this.logger.debug('start ...');
    if (this.wsStatus === WsStatus.shuttingDown) {
      // 主动 start, 结束 shuttingDown 状态
      this.statusTransit(WsStatus.notConnected);
    }
    if (this.wsStatus === WsStatus.shutdown) {
      // 即使本次连接失败，HealthChecker也能起作用
      this.statusTransit(WsStatus.notConnected);
    }
    await this.connectWs();
    this.doStart();
  }

  protected async ensureStart(): Promise<void> {
    if (
      this.wsStatus !== WsStatus.connecting &&
      this.wsStatus !== WsStatus.open
    ) {
      await this.start();
    }
  }

  // 主动关闭。之后还可以再调start
  shutdown(): void {
    this.statusTransit(WsStatus.shuttingDown);
    setTimeout(() => {
      if (this.wsStatus === WsStatus.shuttingDown) {
        // 超时（收不到 close消息）
        this.completeShutdown();
      }
    }, SHUTDOWN_TIMOUT);
    this.disconnectWs();
    this.clearHealthChecker();
    this.doShutdown();
  }

  protected doStart(): void {
    //
  }

  protected doShutdown(): void {
    //
  }

  protected async onWsReady(): Promise<void> {
    // subscribe ...
  }

  // 主动关闭完成（收到close事件）
  protected onShutdown() {
    this.resetCounters();
  }

  // 关闭连接（主动关闭或非预期的关闭）
  protected onClose() {
    //
  }

  // 获取 WebSocket 的连接地址
  protected abstract address(): Promise<string | URL>;

  // 创建 WebSocket 实例
  protected async createWebSocket(
    address: string | URL,
    options: ClientOptions | ClientRequestArgs,
  ): Promise<WebSocket> {
    return new WebSocket(address, options);
  }

  /**
   * 连接 WebSocket
   */
  private async connectWs(): Promise<void> {
    // 保证重连机制工作
    this.ensureHealthChecker();

    // 以下不用考虑长时间的情况：如果长时间没有消息，checker会先断开
    if (this.wsStatus === WsStatus.open) {
      this.logger.debug('已经连接');
      return;
    }
    if (this.wsStatus === WsStatus.connecting) {
      this.logger.debug('正在连接');
      return;
    }
    if (this.wsStatus === WsStatus.shuttingDown) {
      this.logger.debug('正在关闭');
      return;
    }

    this.statusTransit(WsStatus.connecting);

    this._lastConnectTryTs = Date.now();
    if (!this._firstConnectTryTs) {
      this._firstConnectTryTs = this._lastConnectTryTs;
    }
    this._connectTryCounter++;

    if (this._connectTryCounter > 1) {
      this.logger.log(
        `第 ${this._connectTryCounter} 次连接尝试（自 ${new Date(
          this._firstConnectTryTs,
        ).toISOString()}） ...`,
      );
    }

    try {
      const address = await this.address();
      this._ws = await this.createWebSocket(address, this.options);
      this._setupWsEvents();
    } catch (e) {
      this.statusTransit(WsStatus.notConnected);
      this._ws = undefined;
    }
  }

  private _setupWsEvents() {
    // 监听事件
    if (!this._ws) {
      return;
    }
    this._ws.on('open', async () => {
      try {
        if (this.wsStatus === WsStatus.open) {
          // 已经open
          return;
        }
        const now = Date.now();
        this._lastConnectOpenTs = now;
        this._lastTouchTs = now;
        if (!this._firstConnectOpenTs) {
          this._firstConnectOpenTs = now;
        }
        this._connectOpenCounter++;
        this._connectionSpans.push({ startTs: now });
        if (this._connectionSpans.length > KEEP_CONNECTION_SPANS_COUNT) {
          this._connectionSpans.shift();
        }
        this.statusTransit(WsStatus.open);

        this.logger.log('ws连接已打开');
        // try {
        //   // 显示连接管理参数
        //   const durOpts = {
        //     round: true,
        //   };
        //   const pingInterval = zhDuration(this.pingInterval, durOpts);
        //   const lastTouchTimeout = zhDuration(this.lastTouchTimeout, durOpts);
        //   const reconnect = zhDuration(this.reconnectMinInterval, durOpts);
        //   const healthCheck = zhDuration(this.healthCheckInterval, durOpts);
        //   this.logger.debug(`最小ping间隔:\t${pingInterval}`);
        //   this.logger.debug(`连接中断阈值:\t${lastTouchTimeout}`);
        //   this.logger.debug(`最小重连间隔:\t${reconnect}`);
        //   this.logger.debug(`健康检查间隔:\t${healthCheck}`);
        // } catch (e) {
        //   this.logError(e, 'on-open');
        // }

        // 等一会再重置重连间隔，以免很快又断开
        // （比如由于到达频限或认证失败，服务端主动断开）
        setTimeout(() => {
          if (this.wsStatus === WsStatus.open) {
            this.reconnectDelay = 0;
          }
        }, 4000);

        await this.onWsReady();
      } catch (e) {
        this.logError(e, 'on-open');
      }
    });

    const exWs = this;

    this._ws.on('close', function (code: number, reason: Buffer) {
      try {
        const currentWs = exWs._ws === this;
        if (currentWs) {
          exWs.logger.log(`ws连接关闭, code: ${code}`);
        } else {
          exWs.logger?.debug(`上个ws连接关闭, code: ${code}`);
        }
        if (reason) {
          // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
          const reasonText = String(reason);
          if (reasonText) {
            exWs.logger.log(`关闭原因：${reasonText}`);
          }
        }
        if (currentWs || !exWs._ws) {
          // 新连接还未建立
          exWs.closeConnectionSpan();
        }
        this.removeAllListeners();
        if (!currentWs) {
          // 是上个连接。onShutdown/onClose回调不调用
          return;
        }
        // 当前连接关闭
        exWs._ws = undefined;
        if (exWs.wsStatus == WsStatus.shutdown) {
          // 主动关闭已完成（可能会收到不止一个close事件）
          return;
        }
        if (exWs.wsStatus == WsStatus.shuttingDown) {
          // 主动关闭
          exWs.completeShutdown();
        } else {
          exWs.statusTransit(WsStatus.unexpectedClosed);
          exWs.logConnectionSpans();
          exWs.onClose();
        }
      } catch (e) {
        exWs.logError(e, 'on-close');
      }
    });

    this._ws.on('error', (e) => {
      // {
      //       "type": "SocksClientError",
      //       "message": "connect ECONNREFUSED 127.0.0.1:7890",
      //       "stack": ...
      // }

      // {
      //       "errno": -4077,
      //       "code": "ECONNRESET",
      //       "syscall": "read"
      //     }
      this.logError(e['code'] || e, 'on-error');
    });

    this._ws.on('ping', (data: Buffer) => {
      try {
        this._lastTouchTs = Date.now();
        this.gotHeartbeat();
        if (!this._ws) {
          // ping可能在close事件之后到来
          return;
        }
        if (data) {
          const msg = String(data);
          if (this._logMessage) {
            this.logger.log('got ping: ' + msg);
          }
          this.pong(msg);
        } else {
          if (this._logMessage) {
            this.logger.log('got ping');
          }
          this.pong();
        }
      } catch (e) {
        this.logError(e, 'on-ping');
      }
    });

    this._ws.on('pong', (data: Buffer) => {
      try {
        this._lastTouchTs = Date.now();
        if (this._logMessage) {
          if (data) {
            this.logger.log('got pong: ' + String(data));
          } else {
            this.logger.log('got pong');
          }
        }
      } catch (e) {
        this.logError(e, 'on-pong');
      }
    });

    // 接收到消息
    this._ws.on('message', async (rawMsg) => {
      try {
        // this.logger.debug('on message');
        this._lastTouchTs = Date.now();
        await this.onMessage(rawMsg);
      } catch (e) {
        this.logError(e, 'on-message');
      }
    });
  }

  private completeShutdown(): void {
    this.statusTransit(WsStatus.shutdown);
    this.logWsStatus();
    this.logConnectionSpans();
    this.onClose();
    this.onShutdown();
  }

  /**
   * 关闭 WebSocket
   */
  private disconnectWs(): void {
    if (this.wsStatus !== WsStatus.shuttingDown) {
      this.statusTransit(WsStatus.notConnected);
    }
    if (!this._ws) {
      return;
    }
    // 关闭已有连接
    this.logger.log('主动断开 ...');
    try {
      this._ws.close();
    } catch (e) {
      this.logError(e, 'ws.close');
      // 关闭出错，则直接终止
      this._ws.terminate();
      this.closeConnectionSpan();
    }
  }

  private closeConnectionSpan(endTs?: number) {
    const spans = this._connectionSpans;
    const lastSpan = spans.length > 0 ? spans[spans.length - 1] : undefined;
    if (!lastSpan || lastSpan.endTs) {
      return;
    }
    endTs ||= Date.now();
    lastSpan.endTs = endTs;
    lastSpan.spanMs = endTs - lastSpan.startTs;
    this._connectCloseCounter++;
  }

  /**
   * 发送消息
   * @param data
   */
  protected send(data: string): void {
    if (!this._ws || !this.wsReady) {
      this.logger.warn('ws未就绪，send: ' + data);
      return;
    }
    this._ws.send(data);
    if (this._logMessage) {
      this.logger.log(`sent: ${data}`);
    }
    this._sentMessageCounter++;
    this._accumulatedSentMessageCounter++;
  }

  protected sendJson(obj: any): void {
    this.send(JSON.stringify(obj));
  }

  protected heartbeat(): void {
    this.ping();
  }

  protected gotHeartbeat(): void {
    // 收到服务器 ping，主动 ping可以延迟
    this._lastPingTs = Date.now();
  }

  /**
   * 发送 ping 消息
   */
  protected ping(data?: string): void {
    if (!this._ws || !this.wsReady) {
      this.logger.warn('ws未就绪，ping: ' + data);
      return;
    }
    this._ws.ping(data);
    if (this._logMessage) {
      this.logger.log(`ping: ${data || ''}`);
    }
  }

  /**
   * 发送 pong 消息
   * @param data
   */
  protected pong(data?: string): void {
    if (!this._ws || !this.wsReady) {
      this.logger.warn('ws未就绪，pong: ' + data);
      return;
    }
    this._ws.pong(data);
    if (this._logMessage) {
      this.logger.log(`pong: ${data || ''}`);
    }
  }
}
