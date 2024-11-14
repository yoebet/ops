import { io, Socket } from 'socket.io-client';
import { filter, from, Observable, Subject, switchMap, tap } from 'rxjs';
import { EventEmitter } from 'events';
import {
  DataRequest,
  DataRequestParams,
  DataScope,
  MetaDataRequest,
  OflowCommand as Command,
  OflowDataChannel as DataChannel,
  OflowDataType as DataType,
  OflowRequest,
  OflowResponse,
  SubscriptionRequest,
  CompactAggRequestParams,
  ExSymbolScope,
  AggregateRequestParams,
  LiveDataRequest,
  AggregateParams,
  KlineDataScope,
} from './commands';
import { AUTHORIZATION_HEADER } from './constants';

interface ChannelInfo {
  channel: DataChannel;
  subject: Subject<any>;
}

export interface ConnectionEvent {
  event: 'connect' | 'disconnect';
  connectedAt: number;
  disconnectedAt?: number;
}

export interface DataSourceOptions {
  serverBase: string;
  wsPath: string;

  transports?: ('websocket' | 'polling')[];

  // withCredentials?: boolean;

  debug?: boolean;

  accessToken?: string;
}

let DS: WsBase;

export class WsBase extends EventEmitter {
  debug: boolean;

  logBelow1s = false;

  accessToken?: string;

  protected requestNo = 0;

  protected socket?: Socket;

  protected channels = new Map<string, ChannelInfo>();

  protected connectedAt?: number;

  protected disconnectedAt?: number;

  protected connectionSubject = new Subject<ConnectionEvent>();

  protected pendingRequests = new Set<number>();

  constructor(protected options: DataSourceOptions) {
    super();
    this.debug = options.debug || false;
    this.setup();
    if (DS && DS !== this) {
      if (this.debug) {
        console.log(`!!! previous DS exists, shutdown ...`);
      }
      DS.shutdown();
    }
    DS = this;
  }

  protected setup() {
    const { serverBase, wsPath, transports, accessToken } = this.options;
    this.socket = io(serverBase, {
      path: wsPath,
      transports: transports || undefined,
      withCredentials: true,
      extraHeaders: {
        [AUTHORIZATION_HEADER]: accessToken || '',
      },
    });
    this.accessToken = accessToken;
    this.socket.on('connect', this.onConnect.bind(this));
    this.socket.on('disconnect', this.onDisconnect.bind(this));
    this.socket.on('error', console.error);
  }

  resetAccessToken(accessToken: string) {
    if (this.accessToken === accessToken) {
      return;
    }
    this.accessToken = accessToken;
    // TODO:
    // this.socket.disconnect();
    // this.socket.close();
  }

  protected onConnect() {
    if (this.debug) {
      console.log(`connected, ${this.socket!.id}`);
    }
    this.connectedAt = Date.now();
    this.connectionSubject.next({
      event: 'connect',
      connectedAt: this.connectedAt,
      disconnectedAt: this.disconnectedAt,
    });
  }

  protected onDisconnect() {
    if (this.debug) {
      console.log(`disconnected`);
    }
    if (!this.connectedAt) {
      return;
    }
    this.disconnectedAt = Date.now();
    this.connectionSubject.next({
      event: 'disconnect',
      connectedAt: this.connectedAt,
      disconnectedAt: this.disconnectedAt,
    });
  }

  getConnectionSubject(): Observable<ConnectionEvent> {
    return this.connectionSubject.asObservable();
  }

  protected async executeCommand<D = any>(
    command: Command,
    req: OflowRequest,
  ): Promise<D> {
    const reqNo = ++this.requestNo;
    const start = Date.now();
    if (this.debug) {
      const req2: any = { ...req };
      if (req2['params']) {
        req2['params'] = { ...req2['params'] };
        const p2 = req2['params'];
        if (p2['timeFrom']) {
          p2['timeFromStr'] = new Date(p2['timeFrom']).toISOString();
        }
        if (p2['timeTo']) {
          p2['timeToStr'] = new Date(p2['timeTo']).toISOString();
        }
      }
      console.log(`request ${reqNo}:`, req2);
      this.pendingRequests.add(reqNo);
    }
    return new Promise((resolve, reject) => {
      this.socket!.emit(command, req, (response: OflowResponse) => {
        const { data, success, errMsg } = response;
        if (success) {
          if (this.debug) {
            const cost = Date.now() - start;
            let timeStr = `${cost} ms`;
            if (cost >= 1000) {
              timeStr = `${(cost / 1000).toFixed(2)} s`;
            }
            console.log(`response ${reqNo} (${timeStr}):`, data);
            this.pendingRequests.delete(reqNo);
          }
          return resolve(data);
        }
        reject(errMsg);
      });
    });
  }

  showPendingRequests() {
    console.log(
      'PENDING REQUESTS: ',
      [...this.pendingRequests].sort((a, b) => a - b),
    );
  }

  async getMetadata<T>(
    type: MetaDataRequest['type'],
    params?: any,
  ): Promise<T[]> {
    const req: MetaDataRequest = {
      type,
      params,
    };
    return this.executeCommand<T[]>(Command.meta, req);
  }

  async fetchData<T>(
    type: DataType,
    params: DataRequestParams | AggregateRequestParams,
  ): Promise<T[]> {
    const req = {
      type,
      params,
    } as DataRequest;
    return this.executeCommand<T[]>(Command.data, req).then((data: T[]) => {
      // undefined means server side error; no data returns []
      if (!data) {
        throw new Error(`server side error`);
      }
      const ap = params as AggregateParams;
      // TODO:
      const isAggReq = ap.aggFields;
      if (isAggReq) {
        // TODO:
        const sfs = (params as CompactAggRequestParams).aggFields;
        const aggNames = sfs.map((sf) => {
          if (typeof sf === 'string') {
            return sf;
          }
          return sf.name || sf.field;
        });
        data.forEach((item: any) => {
          for (const an of aggNames) {
            if (typeof item[an] === 'string') {
              item[an] = Number(item[an]);
            }
          }
        });
      }
      return data;
    });
  }

  async getLiveData<T>(type: DataType, params: DataScope): Promise<T[]> {
    const req = {
      type,
      params,
    } as LiveDataRequest;
    return this.executeCommand<T[]>(Command.live, req).then((data: T[]) => {
      // undefined means server side error; no data returns []
      if (!data) {
        throw new Error(`server side error`);
      }
      return data;
    });
  }

  protected checkExSymbols(
    dataEx: string,
    dataSymbol: string,
    dataScope: ExSymbolScope,
  ): boolean {
    const { ex, symbol, exSymbols } = dataScope;
    if (!exSymbols) {
      return dataEx === ex && dataSymbol === symbol;
    }
    const exs = exSymbols.find((es) => es.ex === dataEx);
    if (!exs) {
      return false;
    }
    return exs.symbols.includes(dataSymbol);
  }

  protected subscribe<T>(
    channel: DataChannel,
    params: DataScope,
  ): Observable<T> {
    const subReq = {
      channel,
      op: 'subs',
      params,
    } as SubscriptionRequest;
    let channelInfo = this.channels.get(channel);
    if (!channelInfo) {
      const channelSubject = new Subject();
      const handler = (data: any) => {
        channelSubject.next(data);
      };
      channelInfo = {
        channel,
        subject: channelSubject,
      };
      this.channels.set(channel, channelInfo);

      this.socket!.off(channel);
      this.socket!.on(channel, handler);
    }

    const { ex, symbol, exSymbols, interval } = params as KlineDataScope;

    return from(this.executeCommand(Command.subs, subReq)).pipe(
      switchMap((sr) => {
        let symbolKey: string;
        if (exSymbols && typeof sr === 'object' && sr?.symbolKey) {
          symbolKey = sr.symbolKey;
        }
        return channelInfo!.subject.pipe(
          filter((v) => {
            if (channel === DataChannel.ticker) {
              if (symbolKey) {
                if (symbolKey !== v.symbol) {
                  return false;
                }
              } else {
                const es = v.ex === ex && v.symbol === symbol;
                if (!es) {
                  return false;
                }
              }
            } else if (channel === DataChannel.kline) {
              if (exSymbols) {
                if (!this.checkExSymbols(v.ex, v.symbol, params)) {
                  return false;
                }
              } else {
                const es = v.ex === ex && v.symbol === symbol;
                if (!es) {
                  return false;
                }
              }
              if (v.interval !== interval) {
                return false;
              }
            } else {
              return false;
            }
            return true;
          }),
          tap((v) => {
            if (!this.debug) {
              return;
            }
            if (!this.logBelow1s) {
              if (v.interval === '1s') {
                return;
              }
              if (channel === DataChannel.ticker) {
                return;
              }
            }
            let room = `${channel}`;
            if (exSymbols && sr?.symbolKey) {
              room = `${room}:e${exSymbols.length}:${symbolKey}`;
            } else {
              room = `${room}:${ex}:${symbol}`;
            }
            if (channel !== DataChannel.ticker) {
              room = `${room}:${interval}`;
            }

            const nds = new Date().toLocaleTimeString();
            if (typeof v.ts === 'number') {
              const dts = new Date(v.ts).toLocaleTimeString();
              console.log(`${nds}, <${dts}> ${room}`);
            } else {
              console.log(`${nds}, ${room}`);
            }
            console.log(v);
          }),
        );
      }),
    );
  }

  protected async reSubscribe(
    channel: DataChannel,
    params: DataScope,
  ): Promise<void> {
    const subReq = {
      channel,
      op: 'subs',
      params,
    } as SubscriptionRequest;
    await this.executeCommand(Command.subs, subReq);
  }

  async unsubscribe(channel: DataChannel, params: DataScope): Promise<void> {
    const unsubReq = {
      channel,
      op: 'unsub',
      params,
    } as SubscriptionRequest;
    await this.executeCommand(Command.subs, unsubReq);
  }

  shutdown() {
    if (!this.socket) {
      return;
    }
    this.socket.close();
    this.channels.forEach((ci) => {
      ci.subject.complete();
    });
  }
}
