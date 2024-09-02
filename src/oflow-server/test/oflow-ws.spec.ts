import {
  OFLOW_WS_PATH,
  OflowCommand,
  OflowDataChannel,
  OflowDataType,
} from '../constants';
import {
  DataRequest,
  MetaDataRequest,
  SubscriptionRequest,
} from '@/oflow-server/commands';
import { wait } from '@/common/utils/utils';
import { io, Socket } from 'socket.io-client';

// const DataServer = 'http://127.0.0.1:8000';
const DataServer = 'http://18.167.194.75:15000/';

jest.setTimeout(1000_000);

describe('oflow-ws', () => {
  let socket: Socket;

  beforeAll(() => {
    socket = io(DataServer, {
      path: OFLOW_WS_PATH,
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
      socket.emit(OflowCommand.meta, req, (data) => console.log('meta:', data));
    });
    await wait(5000);
  });

  test('meta2', async () => {
    socket.on('connect', () => {
      const req: MetaDataRequest = {
        reqId: '123',
        type: 'coins',
      };
      socket.emit(OflowCommand.meta, req, (data) => console.log('meta:', data));
    });
    await wait(5000);
  });

  test('data', async () => {
    socket.on('connect', () => {
      const req: DataRequest = {
        reqId: '345',
        type: OflowDataType.kline,
        params: {
          ex: 'binance',
          symbol: 'BTC/USDT',
          interval: '15s',
          timeFrom: 1674115440000,
          timeTo: 1674115500000,
          aggFields: [
            {
              field: 'bs',
              method: 'sum',
              name: 'bsAgg',
            },
            {
              field: 'ss',
              method: 'sum',
              name: 'ssAgg',
            },
            {
              field: 'ba',
              method: 'sum',
              name: 'baAgg',
            },
            {
              field: 'sa',
              method: 'sum',
              name: 'saAgg',
            },
          ],
        },
      };
      socket.emit(OflowCommand.data, req, (data) => console.log('data:', data));
    });
    await wait(5000);
  });

  test('sub-btc', async () => {
    const subReq: SubscriptionRequest = {
      channel: OflowDataChannel.ticker,
      op: 'subs',
      params: {
        ex: 'okx',
        symbol: 'BTC/USDT',
        // throttle: 50,
        baseCoin: 'BTC',
        // exSymbols: [
        //   {
        //     ex: 'binance',
        //     symbols: ['BTC/USDT'],
        //   },
        //   {
        //     ex: 'okx',
        //     symbols: ['BTC/USDT'],
        //   },
        // ],
      },
    };
    socket.on('connect', function () {
      socket.emit(OflowCommand.subs, subReq, (data) => {
        console.log(subReq.op, data);
      });
    });
    socket.on(subReq.channel, (data) => {
      console.log(new Date(), data);
    });

    await wait(1000_000);

    const unsubReq = {
      ...subReq,
      op: 'unsub',
    };
    socket.emit(OflowCommand.subs, unsubReq, (data) => {
      console.log(unsubReq.op, data);
    });

    await wait(500_000);
  });

  test('sub-kline-btc', async () => {
    const subReq: SubscriptionRequest = {
      channel: OflowDataChannel.kline,
      op: 'subs',
      params: {
        ex: 'e',
        symbol: 's',
        // throttle: 50,
        baseCoin: 'BTC',
        exSymbols: [
          {
            ex: 'binance',
            symbols: ['BTC/USDT'],
          },
          {
            ex: 'okx',
            symbols: ['BTC/USDT'],
          },
        ],
        interval: '1s',
      },
    };
    socket.on('connect', function () {
      socket.emit(OflowCommand.subs, subReq, (data) => {
        console.log(subReq.op, data);
      });
    });
    socket.on(subReq.channel, (data) => {
      console.log(new Date(), data);
    });

    await wait(1000_000);

    const unsubReq = {
      ...subReq,
      op: 'unsub',
    };
    socket.emit(OflowCommand.subs, unsubReq, (data) => {
      console.log(unsubReq.op, data);
    });

    await wait(500_000);
  });

  test('sub-fpkline-btc', async () => {
    const subReq: SubscriptionRequest = {
      channel: OflowDataChannel.footprint,
      op: 'subs',
      params: {
        ex: 'binance',
        symbol: 'BTC/USDT',
        // throttle: 50,
        baseCoin: 'BTC',
        // exSymbols: [
        //   {
        //     ex: 'binance',
        //     symbols: ['BTC/USDT'],
        //   },
        //   {
        //     ex: 'okx',
        //     symbols: ['BTC/USDT'],
        //   },
        // ],
        prl: 8,
        interval: '1s',
      },
    };
    socket.on('connect', function () {
      socket.emit(OflowCommand.subs, subReq, (data) => {
        console.log(subReq.op, data);
      });
    });
    socket.on(subReq.channel, (data) => {
      console.log(new Date(), data);
    });

    await wait(1000_000);

    const unsubReq = {
      ...subReq,
      op: 'unsub',
    };
    socket.emit(OflowCommand.subs, unsubReq, (data) => {
      console.log(unsubReq.op, data);
    });

    await wait(500_000);
  });
});
