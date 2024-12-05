import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { StrategyTemplate } from '@/db/models/strategy-template';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { BacktestStrategy } from '@/db/models/backtest-strategy';

jest.setTimeout(60_000);

describe('backtest strategy creating', () => {
  beforeEach(async () => {
    await Test.createTestingModule({
      imports: [SystemConfigModule],
    }).compile();
  });

  async function createStrategyFromTemplate(
    st: StrategyTemplate,
    es: ExchangeSymbol,
    tradeType: ExTradeType,
  ) {
    const unifiedSymbol = es.unifiedSymbol;
    const strategy = new BacktestStrategy();
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
    strategy.userExAccountId = 1;
    strategy.tradeType = tradeType;
    strategy.paperTrade = true;
    strategy.active = false;
    strategy.dataFrom = '2024-07-02';
    strategy.dataTo = '2024-07-31';
    await strategy.save();
    console.log(strategy.id);
  }

  it('create strategy', async () => {
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

    const st = await StrategyTemplate.findOneBy({ id: tempId });

    await createStrategyFromTemplate(st, exchangeSymbol, tradeType);
  });

  it('create strategies', async () => {
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

    const sts = await StrategyTemplate.find();

    for (const st of sts) {
      await createStrategyFromTemplate(st, exchangeSymbol, tradeType);
    }
  });

  it('clear current deal', async () => {
    const strategy = await BacktestStrategy.findOneBy({ id: 10 });
    strategy.currentDealId = null;
    await strategy.save();
  });
});
