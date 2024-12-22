import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExTradeType } from '@/db/models/exchange-types';
import { StrategyTemplate } from '@/db/models/strategy/strategy-template';
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

describe('strategy template creating', () => {
  beforeEach(async () => {
    await Test.createTestingModule({
      imports: [CommonServicesModule],
    }).compile();
  });

  it('create templates', async () => {
    const rps = {};
    const mvp: OpportunityCheckerMV = {
      algo: OppCheckerAlgo.MV,
      waitForPercent: 0.2,
      activePercent: 1.5,
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
      for (const closeAlgo of /*Object.values(OppCheckerAlgo)*/ [
        OppCheckerAlgo.MV,
      ]) {
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
});
