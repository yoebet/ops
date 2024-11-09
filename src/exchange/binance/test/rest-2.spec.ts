import { TestConfig } from '@/env.local.test';
import { BinanceSpotRest } from '@/exchange/binance/rest-spot';
import { ExAccountCode } from '@/db/models/exchange-types';
import { storeJson as storeJson0 } from '@/common/test/test-utils.spec';

function storeJson(data: any, fileName: string) {
  storeJson0(data, `${__dirname}/data`, fileName);
}

const { socksProxies, apiKeys } = TestConfig.exchange;
const rest = new BinanceSpotRest({ proxies: socksProxies });
const apiKey = apiKeys[ExAccountCode.binanceSpot];

test('getCapitalConfigs', async () => {
  const data = await rest.getCapitalConfigs(apiKey);
  storeJson(data, 'getCapitalConfigs');
});

test('getSpotBalances', async () => {
  const data = await rest.getCapitalConfigs(apiKey);
  if (data) {
    const dd = data
      .filter((a) => a.free !== '0')
      .map((a) => {
        delete a.networkList;
        return a;
      });
    // storeJson(dd, 'spot-balances-sub');
    console.log(JSON.stringify(dd));
    storeJson(dd, 'getSpotBalances');
  }
});

test('getFundingAssets', async () => {
  const data = await rest.getFundingAssets(apiKey);
  console.log(JSON.stringify(data));
});

test('getDepositAddress', async () => {
  const data = await rest.getDepositAddress(apiKey, {
    coin: 'USDT',
    network: 'TRX',
  });
  storeJson(data, 'deposit-address-USDT-TRX');
});

test('getDepositRecords', async () => {
  const data = await rest.getDepositRecords(apiKey, {
    // coin: 'USDT',
    status: 1,
    startTime: Date.now() - 24 * 60 * 60 * 1000,
  });
  storeJson(data, 'deposit-records');
});

test('getWithdrawRecords', async () => {
  const data = await rest.getWithdrawRecords(apiKey, {
    coin: 'USDT',
    status: 6,
  });
  storeJson(data, 'withdraw-records');
});

test('withdrawApply', async () => {
  const data = await rest.withdrawApply(apiKey, {
    coin: 'USDT',
    amount: 6,
    address: '',
  });
  console.log(JSON.stringify(data));
});

test('getAssetTransferRecords', async () => {
  const data = await rest.getAssetTransferRecords(apiKey, {
    type: 'MAIN_FUNDING',
    startTime: Date.now() - 5 * 30 * 24 * 60 * 60 * 1000,
  });
  storeJson(data, 'asset-transfer-records');
});

test('assetTransfer', async () => {
  const data = await rest.assetTransfer(apiKey, {
    type: 'MAIN_FUNDING',
    asset: 'LTC',
    amount: 0.079441,
  });
  console.log(JSON.stringify(data));
});

test('subAccountAssetTransfer', async () => {
  const data = await rest.subAccountAssetTransfer(apiKey, {
    toEmail: 'hxr_virtual@3xc4415rnoemail.com',
    fromAccountType: 'SPOT',
    toAccountType: 'SPOT',
    asset: 'USDT',
    amount: 20,
  });
  console.log(JSON.stringify(data));
});

test('getSubAccountTransferRecords', async () => {
  const data = await rest.getSubAccountTransferRecords(apiKey, {
    startTime: Date.now() - 24 * 60 * 60 * 1000,
  });
  storeJson(data, 'sub-account-transfer-records');
});

test('getSubAccounts', async () => {
  const data = await rest.getSubAccounts(apiKey);
  storeJson(data, 'sub-accounts');
});
