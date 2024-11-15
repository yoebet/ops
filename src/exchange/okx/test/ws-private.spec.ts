import { wait } from '@/common/utils/utils';
import {
  exWsParams,
  observeWsStatus,
  observeWsSubject,
} from '@/common/test/test-utils.spec';
import { TestConfig } from '@/env.local.test';
import { ExchangeCode } from '@/db/models/exchange-types';
import { OkxWsPrivate } from '@/exchange/okx/okx-ws-private';

const { testApiKeys: apiKeys } = TestConfig.exchange;

const apiKey = apiKeys[ExchangeCode.okx];
const privateWs = new OkxWsPrivate(apiKey, exWsParams());
// privateWs.logMessage = true;

jest.setTimeout(5000_000);

test('account', async () => {
  // observeWsStatus(privateWs, 20_000);

  const subject = privateWs.liveBalanceSubject().subs(['USDT', 'KISHU']);
  observeWsSubject(subject.get());

  await wait(60 * 60 * 1000);
});

test('balance', async () => {
  // observeWsStatus(privateWs, 20_000);

  const subject = privateWs.balanceSubject().subs();
  observeWsSubject(subject.get());

  await wait(60 * 60 * 1000);
});

test('position', async () => {
  // observeWsStatus(privateWs, 20_000);

  const subject = privateWs.positionSubject().subs();
  observeWsSubject(subject.get());

  await wait(60 * 60 * 1000);
});

test('live-position', async () => {
  // observeWsStatus(privateWs, 20_000);

  const subject = privateWs.livePositionSubject().subs(['MARGIN']);
  observeWsSubject(subject.get());

  await wait(60 * 60 * 1000);
});

test('order', async () => {
  // observeWsStatus(privateWs, 20_000);

  const subject = privateWs.orderSubject().subs(['MARGIN']);
  observeWsSubject(subject.get());

  await wait(60 * 60 * 1000);
});
