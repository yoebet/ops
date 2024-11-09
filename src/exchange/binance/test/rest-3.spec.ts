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
test('getPriceIndex', async () => {
  const data = await rest.getPriceIndex(apiKey, 'BNBBTC');
  console.log(JSON.stringify(data), null, 2);
});

test('getExchangeInfoAll', async () => {
  const data = await rest.getExchangeInfoAll();
  storeJson(data, 'market-all-pairs.json');
});

test('getAllCrossPairs', async () => {
  const data = await rest.getAllCrossPairs(apiKey);
  console.log(data.length);
  storeJson(data, 'market-cross-pairs.json');
});

test('getMarginAsset', async () => {
  const data = await rest.getMarginAsset(apiKey, 'LTC');
  storeJson(data, 'margin-asset.json');
});

test('getAllMarginAssets', async () => {
  const data = await rest.getAllMarginAssets(apiKey);
  console.log(data.length);
  storeJson(data, 'margin-assets.json');
});

test('getMarginAccount', async () => {
  const data = await rest.getMarginAccount(apiKey);
  storeJson(data, 'margin-account.json');
});

test('getMarginAccountNonZero', async () => {
  const data = await rest.getMarginAccount(apiKey);
  data['userAssets'] = data['userAssets'].filter((a) => a.free !== '0');
  storeJson(data, 'margin-account-non-0-assets.json');
});

test('getMarginAllOrders', async () => {
  const data = await rest.getMarginAllOrders(apiKey, {
    symbol: 'LTCUSDT',
    isIsolated: true,
  });
  storeJson(data, 'margin-all-orders.json');
});

test('getMarginMyTrades', async () => {
  const data = await rest.getMarginMyTrades(apiKey, {
    symbol: 'LTCUSDT',
    isIsolated: true,
  });
  storeJson(data, 'margin-my-trades.json');
});

test('getMaxBorrowable', async () => {
  const data = await rest.getMaxBorrowable(apiKey, {
    asset: 'BTC',
    isolatedSymbol: 'BTCUSDT',
  });
  storeJson(data, 'max-borrowable.json');
});

test('getMaxTransferable', async () => {
  const data = await rest.getMaxTransferable(apiKey, {
    asset: 'BTC',
    isolatedSymbol: 'BTCUSDT',
  });
  storeJson(data, 'max-transferable.json');
});

test('getBnbBurn', async () => {
  const data = await rest.getBnbBurn(apiKey);
  storeJson(data, 'bnb-burn.json');
});

test('getCrossMarginData', async () => {
  const data = await rest.getCrossMarginData(apiKey, {
    coin: 'USDT',
  });
  storeJson(data, 'cross-margin-data.json');
});

test('getCrossTransferHistory', async () => {
  const data = await rest.getCrossTransferHistory(apiKey, {
    asset: 'USDT',
  });
  storeJson(data, 'cross-transfer-history.json');
});

test('getMarginLoanHistory', async () => {
  const data = await rest.getMarginLoanHistory(apiKey, {
    asset: 'USDT',
    isolatedSymbol: 'BTCUSDT',
  });
  storeJson(data, 'margin-load-history.json');
});

test('getMarginRepayHistory', async () => {
  const data = await rest.getMarginRepayHistory(apiKey, {
    asset: 'USDT',
    isolatedSymbol: 'FILUSDT',
  });
  storeJson(data, 'margin-repay-history.json');
});

test('getForceLiquidationRecords', async () => {
  const data = await rest.getForceLiquidationRecords(apiKey, {
    // isolatedSymbol: 'FILUSDT',
  });
  storeJson(data, 'force-liquidation-records.json');
});

test('getInterestHistory', async () => {
  const data = await rest.getInterestHistory(apiKey, {
    // isolatedSymbol: 'FILUSDT',
  });
  storeJson(data, 'interest-history.json');
});

test('getOrder', async () => {
  const data = await rest.getOrder(apiKey, {
    symbol: 'BNBUSDT',
    isIsolated: true,
    orderId: '3500182859',
  });
  storeJson(data, 'order-get-order.json');
});

test('getOpenOrders', async () => {
  const data = await rest.getOpenOrders(apiKey, {
    symbol: 'BNBUSDT',
    isIsolated: true,
  });
  storeJson(data, 'order-open-orders.json');
});

test('getAllOrders', async () => {
  const data = await rest.getAllOrders(apiKey, {
    symbol: 'BNBUSDT',
    isIsolated: true,
  });
  storeJson(data, 'order-all-orders.json');
});

// 非 GET ...

test('setBnbBurn', async () => {
  const data = await rest.setBnbBurn(apiKey, {
    interestBNBBurn: true,
  });
  storeJson(data, 'bnb-burn.json');
});

test('crossTransfer', async () => {
  const data = await rest.crossTransfer(apiKey, {
    asset: 'BTC',
    amount: '0.000002',
    type: 2,
  });
  storeJson(data, 'cross-transfer.json');
});

test('marginLoan', async () => {
  const data = await rest.marginLoan(apiKey, {
    symbol: 'BNBUSDT',
    asset: 'USDT',
    amount: '60',
    isIsolated: true,
  });
  storeJson(data, 'margin-loan.json');
});

test('marginRepay', async () => {
  const data = await rest.marginRepay(apiKey, {
    symbol: 'BNBUSDT',
    asset: 'USDT',
    amount: '10',
    isIsolated: true,
  });
  storeJson(data, 'margin-repay.json');
});

test('placeOrder', async () => {
  const data = await rest.placeOrder(apiKey, {
    symbol: 'BNBUSDT',
    isIsolated: true,
    side: 'SELL',
    type: 'LIMIT',
    // quoteOrderQty: '30',
    quantity: '0.05',
    price: '600',
    timeInForce: 'GTC',
  });
  storeJson(data, 'order-place-order.json');
});

test('cancelOpenOrders', async () => {
  const data = await rest.cancelOpenOrders(apiKey, {
    symbol: 'BNBUSDT',
    isIsolated: true,
  });
  storeJson(data, 'order-cancel-all.json');
});

test('cancelOrder', async () => {
  const data = await rest.cancelOrder(apiKey, {
    symbol: 'BNBUSDT',
    isIsolated: true,
    orderId: '3500182859',
  });
  storeJson(data, 'order-cancel-one.json');
});
