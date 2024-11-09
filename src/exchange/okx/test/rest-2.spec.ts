import { OkxRest } from '../rest';
import JsonToTS from 'json-to-ts';
import { randomUUID } from 'crypto';
import { ExAccountCode } from '@/db/models/exchange-types';
import { TestConfig } from '@/env.local.test';

const { socksProxies, apiKeys } = TestConfig.exchange;
const apiKey = apiKeys[ExAccountCode.okxUnified];
const rest = new OkxRest({
  proxies: socksProxies,
});

test('getMarkets', async () => {
  const data = await rest.getMarkets({
    instType: 'SWAP',
    // uly: 'TRB-USDT',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getIndexPriceCandles', async () => {
  const data = await rest
    .getIndexPriceCandles({
      instId: 'USDT-USD',
      limit: 1,
    })
    .catch(console.error);
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getFeeRate', async () => {
  const data = await rest.getFeeRate(apiKey, {
    instType: 'SWAP',
    uly: 'BTC-USD',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getAccount', async () => {
  const data = await rest.getAccount(apiKey);
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
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
  console.log(JsonToTS(data).join('\n'));
});

test('getMaxAvailableSize', async () => {
  const data = await rest.getMaxAvailableSize(apiKey, {
    instId: 'ENS-USDT-SWAP',
    tdMode: 'cross',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getLeverageInfo', async () => {
  const data = await rest.getLeverageInfo(apiKey, {
    instId: 'ENS-USDT-SWAP',
    mgnMode: 'cross',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getAssetBalances', async () => {
  const data = await rest.getAssetBalances(apiKey, { ccy: 'USDT' });
  console.log(JSON.stringify(data));
  // console.log(JsonToTS(data).join('\n'));
});

test('getBalances', async () => {
  const data = await rest.getBalances(apiKey, { ccy: 'USDT' });
  console.log(JSON.stringify(data));
  // console.log(JsonToTS(data).join('\n'));
});

test('getMaxWithdrawal', async () => {
  const data = await rest.getMaxWithdrawal(apiKey, { ccy: 'USDT' });
  console.log(JSON.stringify(data));
  // console.log(JsonToTS(data).join('\n'));
});

test('getArchivedBills', async () => {
  const data = await rest.getArchivedBills(apiKey, {
    type: 1,
    limit: 100,
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getPositions', async () => {
  const data = await rest.getPositions(apiKey, {
    instType: 'SWAP',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getPrice', async () => {
  const data = await rest.getTicker({
    instId: 'BTC-USDT',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getOrder', async () => {
  const data = await rest.getOrder(apiKey, {
    instId: 'DOGE-USDT-SWAP',
    ordId: '439113437833220096',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getOpenOrders', async () => {
  const data = await rest.getOpenOrders(apiKey, {
    instType: 'SWAP',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('getClosedOrders', async () => {
  const data = await rest.getClosedOrders(apiKey, {
    instType: 'MARGIN',
  });
  console.log(JSON.stringify(data));
  // console.log(JsonToTS(data).join('\n'));
});

test('createOrder', async () => {
  const data = await rest.createOrder(apiKey, {
    instId: 'DOGE-USDT-SWAP',
    tdMode: 'cross',
    side: 'buy',
    ordType: 'limit',
    sz: '1',
    px: '0.09',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
});

test('cancelOrder', async () => {
  const data = await rest.cancelOrder(apiKey, {
    instId: 'DOGE-USDT-SWAP',
    ordId: '439113437833220096',
  });
  console.log(JSON.stringify(data));
  console.log(JsonToTS(data).join('\n'));
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
