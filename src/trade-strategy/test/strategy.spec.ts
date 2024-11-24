import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import {
  ExchangeCode,
  ExMarket,
  ExTradeType,
} from '@/db/models/exchange-types';
import { StrategyTemplate } from '@/db/models/strategy-template';
import { Strategy } from '@/db/models/strategy';
import { UserExAccount } from '@/db/models/user-ex-account';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import {
  MVStrategyParams,
  StrategyAlgo,
} from '@/trade-strategy/strategy.types';
import { TradeSide } from '@/data-service/models/base';

jest.setTimeout(60_000);

describe('strategy creating', () => {
  beforeEach(async () => {
    await Test.createTestingModule({
      imports: [SystemConfigModule],
    }).compile();
  });

  it('create template', async () => {
    const st = new StrategyTemplate();
    st.code = StrategyAlgo.MV;
    st.name = 'mv1';
    st.tradeType = ExTradeType.spot;
    st.quoteAmount = 200;
    st.params = {
      waitForPercent: 0.2,
      activePercent: 0.5,
      drawbackPercent: 1,
    } as MVStrategyParams;
    await st.save();
  });

  it('create strategy - MV', async () => {
    const code = StrategyAlgo.MV;
    const userId = 1;
    const symbol = 'ETH/USDT';
    const ex = ExchangeCode.okx;
    const market = ExMarket.spot;
    const tradeType = ExTradeType.spot;

    const exchangeSymbol = await ExchangeSymbol.findOne({
      where: {
        ex,
        symbol,
      },
      relations: ['unifiedSymbol'],
    });
    const unifiedSymbol = exchangeSymbol.unifiedSymbol;
    const baseCoin = unifiedSymbol.base;

    const uea = await UserExAccount.findOneBy({ userId, ex });

    const st = await StrategyTemplate.findOneBy({ code });
    const strategy = new Strategy();
    strategy.algoCode = code;
    strategy.name = `${st.name}-${baseCoin}`;
    const params: MVStrategyParams = {
      ...st.params,
      newDealTradeSide: TradeSide.sell,
    };
    strategy.params = params;
    strategy.quoteAmount = st.quoteAmount;
    strategy.ex = ex;
    strategy.market = market;
    strategy.baseCoin = baseCoin;
    strategy.symbol = symbol;
    strategy.rawSymbol = exchangeSymbol.rawSymbol;
    strategy.userExAccountId = uea.id;
    strategy.tradeType = tradeType;
    strategy.paperTrade = true;
    strategy.active = true;
    await strategy.save();
    console.log(strategy);
  });
});
