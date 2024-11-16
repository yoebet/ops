import { OkxRest } from '../rest';
import JsonToTS from 'json-to-ts';
import { randomUUID } from 'crypto';
import { ExchangeCode } from '@/db/models/exchange-types';
import { TestConfig } from '@/env.local.test';
import { storeJson as storeJson0 } from '@/common/test/test-utils.spec';

function storeJson(data: any, fileName: string) {
  storeJson0(data, `${__dirname}/data`, fileName);
}

const { socksProxies, testApiKeys: apiKeys } = TestConfig.exchange;
const rest = new OkxRest({
  proxies: socksProxies,
});
const apiKey = apiKeys[ExchangeCode.okx];

test('getMarkets', async () => {
  const data = await rest.getMarkets({
    instType: 'SWAP',
    // uly: 'TRB-USDT',
  });
  console.log(JSON.stringify(data));
});

test('getPrice', async () => {
  const data = await rest.getTicker({
    instId: 'BTC-USDT',
  });
  console.log(JSON.stringify(data));
});

test('getIndexPriceCandles', async () => {
  const data = await rest
    .getIndexPriceCandles({
      instId: 'USDT-USD',
      limit: 1,
    })
    .catch(console.error);
  console.log(JSON.stringify(data));
});

test('getFeeRate', async () => {
  const data = await rest.getFeeRate(apiKey, {
    instType: 'SWAP',
    uly: 'BTC-USD',
  });
  console.log(JSON.stringify(data));
});

test('getAccount', async () => {
  const data = await rest.getAccount(apiKey);
  console.log(JSON.stringify(data));

  storeJson(data, 'getAccount');
});

test('getMaxOpenSize', async () => {
  const data = await rest
    .getMaxOpenSize(apiKey, {
      instId: 'REN-USDT',
      ccy: 'USDT',
      tdMode: 'cross',
      // leverage: '10',
    })
    .catch(console.error);
  console.log(JSON.stringify(data));
});

test('getMaxAvailableSize-swap', async () => {
  const data = await rest.getMaxAvailableSize(apiKey, {
    instId: 'DOGE-USDT-SWAP',
    tdMode: 'cross',
  });
  console.log(JSON.stringify(data));
});

test('getMaxAvailableSize-margin', async () => {
  const data = await rest.getMaxAvailableSize(apiKey, {
    instId: 'DOGE-USDT',
    ccy: 'USDT',
    tdMode: 'cross',
  });
  console.log(JSON.stringify(data));
});

test('getMaxAvailableSize-cash', async () => {
  const data = await rest.getMaxAvailableSize(apiKey, {
    instId: 'DOGE-USDT,ETH-USDT',
    tdMode: 'cash',
  });
  console.log(JSON.stringify(data));
});

test('getLeverageInfo', async () => {
  const data = await rest.getLeverageInfo(apiKey, {
    instId: 'ENS-USDT-SWAP',
    mgnMode: 'cross',
  });
  console.log(JSON.stringify(data));
});

test('getAssetBalances', async () => {
  const data = await rest.getAssetBalances(apiKey, { ccy: 'USDT' });
  console.log(JSON.stringify(data));

  storeJson(data, 'getAssetBalances');
});

test('getBalances', async () => {
  const data = await rest.getBalances(apiKey, { ccy: 'USDT' });
  console.log(JSON.stringify(data, null, 2));

  // storeJson(data, 'getBalances');
});

test('getMaxWithdrawal', async () => {
  const data = await rest.getMaxWithdrawal(apiKey, { ccy: 'USDT' });
  console.log(JSON.stringify(data));
});

test('getArchivedBills', async () => {
  const data = await rest.getArchivedBills(apiKey, {
    type: 1,
    limit: 100,
  });
  console.log(JSON.stringify(data));
});

test('getPositions', async () => {
  const data = await rest.getPositions(apiKey);
  console.log(JSON.stringify(data));
});

test('getOrder', async () => {
  const data = await rest.getOrder(apiKey, {
    instId: 'DOGE-USDT',
    ordId: '1970951179664408576',
  });
  console.log(JSON.stringify(data));
});

test('getOpenOrders', async () => {
  const data = await rest.getOpenOrders(apiKey, {
    instType: 'MARGIN',
  });
  console.log(JSON.stringify(data, null, 2));
});

test('getClosedOrders', async () => {
  const data = await rest.getClosedOrders(apiKey, {
    instType: 'MARGIN',
    limit: 3,
  });
  console.log(JSON.stringify(data, null, 2));

  storeJson(data, 'getClosedOrders');
});

test('createOrder', async () => {
  const data = await rest.createOrder(apiKey, {
    instId: 'DOGE-USDT',
    tdMode: 'cross',
    side: 'buy',
    ordType: 'limit',
    sz: '1',
    px: '0.09',
  });
  console.log(JSON.stringify(data));
});

test('cancelOrder', async () => {
  const data = await rest.cancelOrder(apiKey, {
    instId: 'DOGE-USDT',
    ordId: '1970951179664408576',
  });
  console.log(JSON.stringify(data));
});

test('cancelBatchOrders', async () => {
  const data = await rest.cancelBatchOrders(apiKey, [
    {
      instId: 'DOGE-USDT',
      ordId: '1973407832741560320',
    },
    {
      instId: 'DOGE-USDT',
      ordId: '1973377698714140672',
    },
  ]);
  console.log(JSON.stringify(data));
});

test('getInterestRate', async () => {
  const data = await rest
    .getInterestRate(apiKey, {})
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('getInterestLimits', async () => {
  const data = await rest
    .getInterestLimits(apiKey, { ccy: 'WAVES' })
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('getMarginInterestAccrued', async () => {
  const data = await rest
    .getMarginInterestAccrued(apiKey, { /*ccy: 'USDT',*/ limit: 10 })
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('getDepositAddress', async () => {
  const data = await rest
    .getDepositAddress(apiKey, { ccy: 'BTC' })
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('getDepositRecords', async () => {
  const data = await rest
    .getDepositRecords(apiKey, {
      ccy: 'USDT',
      before: 1657116931870,
      after: 1657122361870,
    })
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('getWithdrawRecords', async () => {
  const data = await rest
    .getWithdrawRecords(apiKey, {})
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('submitWithdrawal', async () => {
  const data = await rest
    .submitWithdrawal(apiKey, {
      ccy: 'USDT',
      amt: '16',
      chain: 'USDT-TRC20',
      fee: '0.8',
      dest: '4',
      clientId: randomUUID(),
      toAddr: 'xxx',
    })
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('assetTransfer', async () => {
  const data = await rest
    .assetTransfer(apiKey, { ccy: 'USDT', amt: '12', from: '18', to: '6' })
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('assetTransfer-sub-account', async () => {
  const data = await rest
    .assetTransfer(apiKey, {
      ccy: 'USDT',
      amt: '5',
      from: '6',
      to: '6',
      subAcct: 'wuhxrdw',
      type: '2',
      clientId: '2467a',
    })
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('getAssetTransferState', async () => {
  const data = await rest
    .getAssetTransferState(apiKey, {
      transId: '3857264',
      type: '1',
    })
    .catch((e) => console.error(e.details));
  console.log(JSON.stringify(data));
});

test('getAssetCurrencies', async () => {
  const data = await rest.getAssetCurrencies(apiKey).catch(console.error);
  console.log(JSON.stringify(data));
});

test('getSubAccounts', async () => {
  const data = await rest.getSubAccounts(apiKey).catch(console.error);
  console.log(JSON.stringify(data));
});

test('getSubAccountBalances', async () => {
  const data = await rest
    .getSubAccountBalances(apiKey, { subAcct: 'wuhxrdw' })
    .catch(console.error);
  console.log(JSON.stringify(data));
});
