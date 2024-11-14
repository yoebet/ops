import { io, Socket } from 'socket.io-client';
import {
  DataRequest,
  LiveKlineRequest,
  LiveTickerRequest,
  MetaDataRequest,
  OflowCommand,
  OflowDataChannel,
  OflowDataType,
  SubscriptionRequest,
} from '../commands';
import { wait } from '@/common/utils/utils';
import { TestConfig } from '@/env.local.test';

const oflowServer = TestConfig.oflow;

jest.setTimeout(100_000);

describe('socket.io', () => {
  let socket: Socket;

  beforeAll(() => {
    socket = io(oflowServer.base, {
      path: oflowServer.wsPath,
      // transports: ['websocket' /*'polling'*/],
      // withCredentials: true,
    });
    socket.on('connect', function () {
      console.log(`Connected, ${socket.id}`);
    });
  });

  test('meta', async () => {
    socket.on('connect', () => {
      const req: MetaDataRequest = {
        reqId: '123',
        type: 'exchanges',
      };
      socket.emit(OflowCommand.meta, req, (data: any) =>
        console.log('meta:', data),
      );
    });
    await wait(5000);
  });

  test('data', async () => {
    socket.on('connect', () => {
      const req: DataRequest = {
        reqId: '345',
        type: OflowDataType.kline,
        params: {
          ex: 'okx',
          symbol: 'BTC/USDT',
          interval: '1m',
          timeFrom: Date.now() - 60 * 60 * 1000,
          timeTo: undefined,
        },
      };
      socket.emit(OflowCommand.data, req, (data: any) =>
        console.log('data:', data),
      );
    });
    await wait(5000);
  });

  test('get latest ticker', async () => {
    socket.on('connect', () => {
      const req: LiveTickerRequest = {
        reqId: '345',
        type: OflowDataType.ticker,
        params: {
          baseCoin: 'BTC',
          ex: 'binance',
          symbol: 'BTC/USDT',
        },
      };
      socket.emit(OflowCommand.live, req, (data: any) =>
        console.log('data:', data),
      );
    });
    await wait(50_000);
  });

  test('get live kline', async () => {
    socket.on('connect', () => {
      const req: LiveKlineRequest = {
        reqId: '345',
        type: OflowDataType.kline,
        params: {
          baseCoin: 'BTC',
          ex: 'binance',
          symbol: 'BTC/USDT',
          interval: '15m',
        },
      };
      socket.emit(OflowCommand.live, req, (data: any) =>
        console.log('data:', data),
      );
    });
    await wait(50_000);
  });

  test('sub', async () => {
    const subReq: SubscriptionRequest = {
      channel: OflowDataChannel.kline,
      op: 'subs',
      params: {
        ex: 'okx',
        symbol: 'BTC/USDT',
        interval: '1s',
      },
    };
    socket.on('connect', function () {
      socket.emit(OflowCommand.subs, subReq, (data: any) => {
        console.log(subReq.op, data);
      });
    });
    socket.on(subReq.channel, (data) => {
      console.log(subReq.channel, data);
    });

    await wait(10_000);

    const unsubReq = {
      ...subReq,
      op: 'unsub',
    };
    socket.emit(OflowCommand.subs, unsubReq, (data: any) => {
      console.log(unsubReq.op, data);
    });

    await wait(50_000);
  });
});
