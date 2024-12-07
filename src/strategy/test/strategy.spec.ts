import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { StrategyTemplate } from '@/db/models/strategy-template';
import { Strategy } from '@/db/models/strategy';
import { UserExAccount } from '@/db/models/user-ex-account';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import {
  IntegratedStrategyParams,
  OppCheckerAlgo,
  OpportunityCheckerBB,
  OpportunityCheckerBR,
  OpportunityCheckerFP,
  OpportunityCheckerJP,
  OpportunityCheckerLS,
  OpportunityCheckerMV,
  StrategyAlgo,
} from '@/strategy/strategy.types';

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
    strategy.openAlgo = st.openAlgo;
    strategy.closeAlgo = st.closeAlgo;
    strategy.openDealSide = st.openDealSide;
    strategy.name = `${st.name}/${unifiedSymbol.base}`;
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

  it('create templates', async () => {
    const rps = {};
    const mvp: OpportunityCheckerMV = {
      algo: OppCheckerAlgo.MV,
      waitForPercent: 0.2,
      activePercent: 0.5,
      drawbackPercent: 1,
    };
    rps[OppCheckerAlgo.MV] = mvp;
    const brp: OpportunityCheckerBR = {
      algo: OppCheckerAlgo.BR,
      interval: '1m',
      periods: 16,
      checkPeriods: 3,
      contrastPeriods: 12,
      baselineAmountTimes: 2,
      baselinePriceChangeTimes: 1.5,
      selfAmountTimes: 5,
      selfPriceChangeTimes: 3,
    };
    rps[OppCheckerAlgo.BR] = brp;
    const fpp: OpportunityCheckerFP = {
      algo: OppCheckerAlgo.TP,
      waitForPercent: 0.5,
      priceDiffPercent: 2,
    };
    rps[OppCheckerAlgo.TP] = fpp;
    const lsp: OpportunityCheckerLS = {
      algo: OppCheckerAlgo.LS,
      interval: '5m',
      periods: 16,
      checkPeriods: 8,
      contrastPeriods: 4,
      amountTimes: 0.3,
      priceChangeTimes: 0.3,
    };
    rps[OppCheckerAlgo.LS] = lsp;
    const jpp: OpportunityCheckerJP = {
      algo: OppCheckerAlgo.JP,
      interval: '15m',
      jumpPeriods: 3,
      stopPeriods: 2,
      priceChangeTimes: 3,
    };
    rps[OppCheckerAlgo.JP] = jpp;
    const bbp: OpportunityCheckerBB = {
      algo: OppCheckerAlgo.BB,
      interval: '15m',
      periods: 20,
      stdTimes: 2,
    };
    rps[OppCheckerAlgo.BB] = bbp;
    for (const openAlgo of Object.values(OppCheckerAlgo)) {
      for (const closeAlgo of Object.values(OppCheckerAlgo)) {
        const st = new StrategyTemplate();
        st.code = StrategyAlgo.INT;
        st.openAlgo = openAlgo;
        st.closeAlgo = closeAlgo;
        st.openDealSide = 'both';
        st.name = `${st.openAlgo}-${st.closeAlgo}/${st.openDealSide}`;
        st.tradeType = ExTradeType.spot;
        st.quoteAmount = 100;
        st.params = {
          stopLoss: {
            priceDiffPercent: 1,
          },
          lossCoolDownInterval: '4h',
          minCloseInterval: '15m',
          maxCloseInterval: '1d',
          open: rps[st.openAlgo],
          close: rps[st.closeAlgo],
        } as IntegratedStrategyParams;
        await st.save();
      }
    }
  });

  it('create template - br', async () => {
    const bbp: OpportunityCheckerBB = {
      algo: OppCheckerAlgo.BB,
      interval: '15m',
      periods: 20,
      stdTimes: 2,
    };
    const st = new StrategyTemplate();
    st.code = StrategyAlgo.INT;
    st.openAlgo = OppCheckerAlgo.BB;
    st.closeAlgo = OppCheckerAlgo.BB;
    st.openDealSide = 'both';
    st.name = `${st.openAlgo}-${st.closeAlgo}/${st.openDealSide}`;
    st.tradeType = ExTradeType.spot;
    st.quoteAmount = 100;
    st.params = {
      stopLoss: {
        priceDiffPercent: 1,
      },
      lossCoolDownInterval: '4h',
      minCloseInterval: '15m',
      maxCloseInterval: '1d',
      open: bbp,
      close: bbp,
    } as IntegratedStrategyParams;
    await st.save();
  });

  it('create strategy', async () => {
    const userId = 1;
    const tempId = 56;
    const symbol = 'ETH/USDT';
    const ex = ExchangeCode.binance;
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
    const ex = ExchangeCode.binance;
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
