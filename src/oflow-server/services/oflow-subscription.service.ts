import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as Rx from 'rxjs';
import {
  DataScope,
  FPDataScope,
  KlineDataScope,
  OflowResponse,
  SubscriptionRequest,
} from '../commands';
import { OflowDataChannel, TICKER_THROTTLE } from '@/oflow-server/constants';
import { AppLogger } from '@/common/app-logger';
import {
  RtFpKline,
  RtKline,
  RtPrice,
  RtTicker,
} from '@/data-service/models/realtime';
import {
  ChannelConsumer,
  DataChannelService,
} from '@/data-service/data-channel.service';

interface RoomInfo {
  room: string;
  req: SubscriptionRequest;
  symbolKey?: string;
  channelConsumer: ChannelConsumer<RtPrice | RtTicker | RtKline | RtFpKline>;
  channelTopic: string;
  subscription?: Rx.Subscription;
  aboutToStop?: boolean;
}

@Injectable()
export class OflowSubscriptionService {
  server: Server;

  protected roomInfos = new Map<string, RoomInfo>();

  symbolKeyCountersMap = new Map<number, number>();

  symbolKeysMap = new Map<string, string>();

  constructor(
    private dataChannelService: DataChannelService,
    private logger: AppLogger,
  ) {
    logger.setContext('oflow-subs');
  }

  protected getRoom(req: SubscriptionRequest, symbolKey?: string) {
    const { channel, params: dataScope } = req;
    const { ex, symbol, exSymbols } = dataScope;
    let room = channel === 'footprint' ? 'FP' : channel;
    if (exSymbols) {
      room = `${room}:e${exSymbols.length}:${symbolKey}`;
    } else {
      room = `${room}:${ex}:${symbol}`;
    }
    if (
      channel === OflowDataChannel.kline ||
      channel === OflowDataChannel.footprint
    ) {
      room = `${room}:${dataScope.interval}`;
    }
    if (channel === OflowDataChannel.footprint) {
      room = `${room}:${dataScope.prl}`;
    }
    if (channel === OflowDataChannel.ticker) {
      const throttle = dataScope.throttle;
      if (throttle) {
        const align10 = throttle + 5 - (throttle % 10);
        room = `${room}|${align10}`;
      }
    }
    return room;
  }

  protected getSymbolKey(exSymbols: DataScope['exSymbols'], baseCoin?: string) {
    const symbolsCount = exSymbols.reduce(
      (pv, cv) => pv + cv.symbols.length,
      0,
    );
    const kk = exSymbols
      .sort((e1, e2) => e1.ex.localeCompare(e2.ex))
      .map(
        ({ ex, symbols }) =>
          `${ex}:${symbols.sort((s1, s2) => s1.localeCompare(s2)).join('|')}`,
      )
      .join(',')
      .replace(/-PERP/g, '-P')
      .replace(/\/USD/g, '/U');
    let symbolKey = this.symbolKeysMap.get(kk);
    if (!symbolKey) {
      let counter = this.symbolKeyCountersMap.get(symbolsCount);
      if (!counter) {
        counter = 1;
      }
      symbolKey = `${baseCoin || ''}~s${symbolsCount}-${counter}`;
      counter++;
      this.symbolKeyCountersMap.set(symbolsCount, counter);
      this.symbolKeysMap.set(kk, symbolKey);
    }
    return symbolKey;
  }

  async subs(req: SubscriptionRequest, socket: Socket): Promise<OflowResponse> {
    const { op, channel, params: dataScope } = req;

    if (typeof dataScope['interval'] === 'string') {
      dataScope['interval'] = dataScope['interval'].toLowerCase();
    }

    let symbolKey: string;
    if (dataScope.exSymbols) {
      symbolKey = this.getSymbolKey(dataScope.exSymbols, dataScope.baseCoin);
    }
    if (typeof dataScope['interval'] === 'string') {
      dataScope['interval'] = dataScope['interval'].toLowerCase();
    }

    const room = this.getRoom(req, symbolKey);
    let roomInfo = this.roomInfos.get(room);

    if (op === 'subs') {
      const firstOne = !!roomInfo;
      if (!roomInfo) {
        let channelTopic = '';
        switch (channel) {
          case OflowDataChannel.kline:
            channelTopic = this.dataChannelService.getKlineTopic(
              dataScope.baseCoin,
              dataScope.interval,
            );
            break;
          case OflowDataChannel.footprint:
            channelTopic = this.dataChannelService.getFpKlineTopic(
              dataScope.baseCoin,
              dataScope.interval,
              dataScope.prl,
            );
            break;
          case OflowDataChannel.ticker:
            // channelTopic = this.dataChannelService.getTickerTopic(
            //   dataScope.baseCoin,
            // );
            channelTopic = this.dataChannelService.getPriceTopic(
              dataScope.baseCoin,
            );
            break;
          default:
            return {
              success: false,
              errMsg: '不支持的 channel : ' + channel,
              data: undefined,
            };
        }

        const channelConsumer = this.dataChannelService.getOrBuildConsumer<any>(
          [channelTopic],
          `oflow/${room}`,
        );
        roomInfo = {
          room,
          req,
          channelConsumer,
          channelTopic,
          symbolKey,
        };
        this.roomInfos.set(room, roomInfo);
      }

      socket.join(room);
      this.logger.log(`${socket.id} join room: [${room}]`);

      if (firstOne || !roomInfo.subscription) {
        this.startPublish(roomInfo);
      }
    } else {
      socket.leave(room);
      this.logger.log(`${socket.id} leave room: [${room}]`);

      this.checkEmptyRoom(roomInfo).catch((err) => {
        this.logger.error(err);
      });
    }

    return {
      success: true,
      data: dataScope.exSymbols ? { symbolKey } : 'ok',
    };
  }

  protected async checkEmptyRoom(roomInfo: RoomInfo) {
    if (!roomInfo) {
      return;
    }
    const room = roomInfo.room;
    const broadcast = this.server.in(room);
    const roomSockets = await broadcast.fetchSockets();
    if (roomSockets.length === 0) {
      this.logger.log(`no man in room: [${room}]`);
      roomInfo.aboutToStop = true;
      setTimeout(async () => {
        if (!this.roomInfos.has(room)) {
          return;
        }
        if (!roomInfo.aboutToStop) {
          return;
        }
        const roomSockets2 = await broadcast.fetchSockets();
        if (roomSockets2.length === 0) {
          this.stopPublish(roomInfo);
        }
      }, 10_000);
    }
  }

  protected checkEmptyRooms(): any {
    for (const [room, roomInfo] of this.roomInfos) {
      this.checkEmptyRoom(roomInfo).catch((err) => {
        console.error(err);
      });
    }
  }

  handleDisconnect(socket: Socket): any {
    this.checkEmptyRooms();
  }

  protected startPublish(roomInfo: RoomInfo) {
    const {
      room,
      req,
      channelTopic,
      channelConsumer,
      subscription,
      aboutToStop,
    } = roomInfo;
    this.logger.log(`[${room}] start publish`);

    if (subscription) {
      subscription.unsubscribe();
    }
    if (aboutToStop) {
      roomInfo.aboutToStop = false;
    }

    const broadcast = this.server.in(room);

    let source = channelConsumer.getSubject(channelTopic).pipe(
      Rx.map((v) => {
        try {
          switch (req.channel) {
            case OflowDataChannel.kline:
              return this.processRtKLine(v as RtKline, req.params);
            case OflowDataChannel.footprint:
              return this.processRtFpKline(v as RtFpKline, req.params);
            case OflowDataChannel.ticker:
              // return this.tickerToRtPrice(v as RtTicker, roomInfo);
              return this.tickerToRtPrice(v as RtPrice, roomInfo);
          }
        } catch (e) {
          this.logger.error(e);
        }
        return undefined;
      }),
      Rx.filter((v) => !!v),
    );
    if (req.channel === OflowDataChannel.ticker) {
      const thr = Math.max(
        req.params.throttle || TICKER_THROTTLE.DEFAULT,
        TICKER_THROTTLE.MIN,
      );
      source = source.pipe(Rx.throttleTime(thr));
    }
    roomInfo.subscription = source.subscribe({
      next: (v) => {
        if (v) {
          broadcast.emit(req.channel, v);
        }
      },
      error: (err) => {
        console.error(`[${room}]`, err);
      },
      complete: () => {
        console.log(`[${room}] completed`);
      },
    });
  }

  protected tickerToRtPrice(value: RtPrice, roomInfo: RoomInfo): RtPrice {
    const { req, symbolKey } = roomInfo;
    const { ex, symbol, exSymbols } = req.params;
    if (!exSymbols) {
      if (value.ex != ex || value.symbol != symbol) {
        return undefined;
      }
      return {
        ex: value.ex,
        symbol: value.symbol,
        ts: value.ts,
        price: value.price,
      };
    }
    if (!this.checkExSymbols(value.ex, value.symbol, req.params)) {
      return undefined;
    }
    if (!symbolKey) {
      return undefined;
    }
    return {
      ex: `${value.ex}:${value.symbol}`,
      symbol: symbolKey,
      ts: value.ts,
      price: value.price,
    };
  }

  protected checkExSymbols(
    dataEx: string,
    dataSymbol: string,
    dataScope: DataScope,
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

  protected processRtKLine(value: RtKline, dataScope: KlineDataScope): RtKline {
    if (!this.checkExSymbols(value.ex, value.symbol, dataScope)) {
      return undefined;
    }
    if (value.interval != dataScope.interval) {
      return undefined;
    }
    return value;
  }

  protected processRtFpKline(
    value: RtFpKline,
    dataScope: FPDataScope,
  ): RtFpKline {
    if (!this.checkExSymbols(value.ex, value.symbol, dataScope)) {
      return undefined;
    }
    if (value.interval != dataScope.interval || value.prl != dataScope.prl) {
      return undefined;
    }
    return value;
  }

  protected stopPublish(roomInfo: RoomInfo) {
    const { room, subscription } = roomInfo;
    this.logger.log(`[${room}] stop publish`);
    if (subscription) {
      subscription.unsubscribe();
      roomInfo.subscription = undefined;
    }
    roomInfo.aboutToStop = false;
    this.roomInfos.delete(room);
  }
}
