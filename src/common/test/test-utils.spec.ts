import * as fs from 'fs';
import * as path from 'path';
import * as Rx from 'rxjs';
import { ExWs, ExWsParams } from '@/exchange/base/ws/ex-ws';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Agent } from 'http';
import { TestConfig } from '@/env.local.test';

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
  const proxyUrl = TestConfig.exchange.socksProxies;
  return proxyUrl && proxyUrl.length > 0
    ? new SocksProxyAgent(proxyUrl[0])
    : undefined;
};

export function exWsParams(): Partial<ExWsParams> {
  return {
    agent: getAgent(),
  };
}
