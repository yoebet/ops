import * as Rx from 'rxjs';
import { Test } from '@nestjs/testing';
import {
  MonitorCommand,
  MonitorCommandName,
  MonitorStreamCommand,
  MonitorStreamCommandName,
  WsStatusType,
} from '@/exchange/base/ws/ex-ws-monitor-types';
import { ExchangeCode } from '@/db/models/exchange-types';
import { wait } from '@/common/utils/utils';
import { ExchangeWsService } from '@/exchange/exchange-ws.service';
import { OkxWs } from '@/exchange/okx/ws';
import { ExchangeModule } from '@/exchange/exchange.module';

jest.setTimeout(60 * 60_000);

const ExCode = ExchangeCode.okx;
console.log(`ex: ${ExCode}`);

describe('ExMonitor', () => {
  let wsService: ExchangeWsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ExchangeModule],
    }).compile();

    await moduleRef.init();

    wsService = moduleRef.get(ExchangeWsService);

    const ws = wsService.init(ExCode, OkxWs, { idComponents: {} });
    ws.tradeSubject()
      .subs(['BTC-USDT'])
      .get()
      .subscribe((e) => console.log(`> ${e.price}`));
  });

  function observeStream(stream: Rx.Observable<any>) {
    return stream.subscribe({
      next: console.log,
      error: console.error,
      complete: () => {
        console.log('complete.');
      },
    });
  }

  async function monitor(cmd: MonitorCommand) {
    const result = await wsService.monitor(ExCode, cmd);
    console.log(result);
  }

  async function monitorStream(cmd: MonitorStreamCommand) {
    const stream = await wsService.monitorStream(ExCode, cmd);

    observeStream(stream);
    await wait(30 * 60 * 1000);
  }

  describe('-', () => {
    it('showInstances', async () => {
      await monitor({ name: MonitorCommandName.showInstances });
    });
    it('showStatus', async () => {
      await monitor({
        name: MonitorCommandName.showStatus,
        type: WsStatusType.subjects,
        criteria: {
          instanceIndex: 1,
        },
        // leafOnly: true,
      });
    });

    it('observeStatus', async () => {
      await monitorStream({
        name: MonitorStreamCommandName.observeStatus,
        interval: 10_000,
        criteria: {
          ids: 'public-ws:1',
          // category: 'public-ws',
        },
      });
    });
    it('observeChannel', async () => {
      await wait(3000);
      await monitorStream({
        name: MonitorStreamCommandName.observeChannel,
        channel: 'trades',
        minInterval: 1_000,
        // criteria: {
        //   ids: 'public-ws:1',
        // },
      });
    });
  });
});
