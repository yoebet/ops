import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { Coin } from '@/db/models/coin';
import { UnifiedSymbol } from '@/db/models/unified-symbol';
import {
  ExAccountCode,
  ExchangeCode,
  ExMarket,
} from '@/db/models/exchange-types';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';

jest.setTimeout(60_000);

describe('CoinConfigService', () => {
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule],
    }).compile();

    await moduleRef.init();
  });

  it('create - BTC', async () => {
    const btc = new Coin();
    btc.coin = 'BTC';
    await Coin.save(btc);
  });

  it('add symbols', async () => {
    const coins = ['LTC', 'LUNC', 'USTC', 'FIL'];
    const stableCoin = 'USDT';
    for (const coin of coins) {
      let cc = await Coin.findOneBy({ coin });
      if (!cc) {
        cc = new Coin();
        cc.coin = coin;
        await Coin.save(cc);
      }

      const symbol = `${coin}/${stableCoin}`;
      let us = await UnifiedSymbol.findOneBy({ symbol });
      if (us) {
        console.log(`${symbol} existed.`);
        continue;
      }
      us = new UnifiedSymbol();
      us.base = coin;
      us.quote = stableCoin;
      us.settle = stableCoin;
      us.symbol = symbol;
      us.market = ExMarket.spot;
      await us.save();

      for (const ex of Object.values(ExchangeCode)) {
        const bas = new ExchangeSymbol();
        bas.ex = ex;
        bas.market = us.market;
        bas.symbol = us.symbol;
        if (ex === ExchangeCode.binance) {
          bas.rawSymbol = `${coin}${stableCoin}`;
          bas.exAccount = ExAccountCode.binanceSpot;
        } else if (ex === ExchangeCode.okx) {
          bas.rawSymbol = `${coin}-${stableCoin}`;
          bas.exAccount = ExAccountCode.okxUnified;
        } else {
          continue;
        }
        await bas.save();
      }
    }
  });
});
