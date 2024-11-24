import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { StrategyTemplate } from '@/db/models/strategy-template';
import { Strategy } from '@/db/models/strategy';
import { UserExAccount } from '@/db/models/user-ex-account';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import {
  BRStrategyParams,
  MVCheckerParams,
  MVStrategyParams,
  StrategyAlgo,
} from '@/trade-strategy/strategy.types';
import {
  DefaultBRCheckerParams,
  defaultMVCheckerParams,
} from '@/trade-strategy/strategy.constants';

jest.setTimeout(60_000);

describe('strategy creating', () => {
  beforeEach(async () => {
    await Test.createTestingModule({
      imports: [SystemConfigModule],
    }).compile();
  });

  async function createStrategyFromTemplate(
    st: StrategyTemplate,
    es: ExchangeSymbol,
    tradeType: ExTradeType,
    uea: UserExAccount,
  ) {
    const unifiedSymbol = es.unifiedSymbol;
    const strategy = new Strategy();
    strategy.algoCode = st.code;
    strategy.name = `${st.name}-${unifiedSymbol.base}`;
    strategy.params = st.params;
    strategy.quoteAmount = st.quoteAmount;
    strategy.ex = es.ex;
    strategy.market = es.market;
    strategy.baseCoin = unifiedSymbol.base;
    strategy.symbol = es.symbol;
    strategy.rawSymbol = es.rawSymbol;
    strategy.userExAccountId = uea.id;
    strategy.tradeType = tradeType;
    strategy.paperTrade = true;
    strategy.active = true;
    await strategy.save();
    console.log(strategy.id);
  }

  const mvcParams: MVCheckerParams = {
    waitForPercent: 0.2,
    activePercent: 0.5,
    drawbackPercent: 1,
  };

  it('create template - mv', async () => {
    for (const code of [
      StrategyAlgo.MVB,
      StrategyAlgo.MVS,
      StrategyAlgo.MVBS,
    ]) {
      const st = new StrategyTemplate();
      st.code = code;
      st.name = code;
      st.tradeType = ExTradeType.spot;
      st.quoteAmount = 200;
      st.params = {
        open: mvcParams,
        close: mvcParams,
      } as MVStrategyParams;
      await st.save();
    }
  });

  it('create template - br', async () => {
    const st = new StrategyTemplate();
    st.code = StrategyAlgo.BR;
    st.name = 'br';
    st.tradeType = ExTradeType.spot;
    st.quoteAmount = 200;
    st.params = {
      open: DefaultBRCheckerParams,
      close: mvcParams,
    } as BRStrategyParams;
    await st.save();
  });

  it('create strategy', async () => {
    const userId = 1;
    const tempId = 1;
    const symbol = 'ETH/USDT';
    const ex = ExchangeCode.okx;
    const tradeType = ExTradeType.spot;

    const exchangeSymbol = await ExchangeSymbol.findOne({
      where: {
        ex,
        symbol,
      },
      relations: ['unifiedSymbol'],
    });

    const uea = await UserExAccount.findOneBy({ userId, ex });

    const st = await StrategyTemplate.findOneBy({ id: tempId });

    await createStrategyFromTemplate(st, exchangeSymbol, tradeType, uea);
  });

  it('create strategies', async () => {
    const userId = 1;
    const symbol = 'ETH/USDT';
    const ex = ExchangeCode.okx;
    const tradeType = ExTradeType.spot;

    const exchangeSymbol = await ExchangeSymbol.findOne({
      where: {
        ex,
        symbol,
      },
      relations: ['unifiedSymbol'],
    });

    const uea = await UserExAccount.findOneBy({ userId, ex });

    const sts = await StrategyTemplate.find();

    for (const st of sts) {
      await createStrategyFromTemplate(st, exchangeSymbol, tradeType, uea);
    }
  });
});
