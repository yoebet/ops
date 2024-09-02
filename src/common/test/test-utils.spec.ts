import * as fs from 'fs';
import * as path from 'path';
import * as Rx from 'rxjs';
import { ExWs, ExWsParams } from '@/exchange/base/ws/ex-ws';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Agent } from 'http';
import { TestConfig } from '@/test/test-config.spec';
import { getTsNow, tsToISO8601, wait } from '@/common/utils/utils';

jest.setTimeout(50_000);

export function storeJson(data: any, dir: string, fileName: string) {
  if (!fileName.endsWith('.json')) {
    fileName = fileName + '.json';
  }
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(path.join(dir, fileName), json);
}

export function observeWsStatus(ws: ExWs, interval = 6000) {
  return setInterval(() => {
    if (!ws.wsShutdown) {
      ws.logWsStatus();
      ws.logSubjectsStatus();
    }
  }, interval);
}

export function observeWsSubject(
  subject: Rx.Observable<any>,
  logRawJson = true,
): Rx.Subscription {
  return subject.subscribe({
    next: (obj) => {
      if (logRawJson) {
        console.log(JSON.stringify(obj, null, 2));
      } else {
        console.log(obj);
      }
      // console.log(JsonToTS(obj).join('\n'));
    },
    error: console.error,
    complete: () => {
      console.log('complete.');
    },
  });
}

export const getAgent = (): Agent | undefined => {
  const proxyUrl = TestConfig.exchange.socksProxyUrl;
  return proxyUrl ? new SocksProxyAgent(proxyUrl) : undefined;
};

export function exWsParams(): Partial<ExWsParams> {
  return {
    agent: getAgent(),
  };
}

test('toISO8601', async () => {
  console.log(tsToISO8601(1669199092536));
  await wait(2_000);
});

test('floor', async () => {
  const a = Math.floor(1669199092536 / 1000);
  console.log(a);
  const b = a % 60;
  console.log(b);
  await wait(2_000);
});

test('nextMonth', async () => {
  const date = new Date(getTsNow() + 32 * 24 * 60 * 60 * 1000); //起始时间32天之后 一定是下个月
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth()));
  console.log(d.getTime());
});

test('tsNow', async () => {
  console.log(getTsNow());
});
