import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { StrategyTemplate } from '@/db/models/strategy/strategy-template';
import { Strategy } from '@/db/models/strategy/strategy';
import { UserExAccount } from '@/db/models/sys/user-ex-account';
import { ExchangeSymbol } from '@/db/models/ex/exchange-symbol';
import { TradeSide } from '@/data-service/models/base';
import { Coin } from '@/db/models/ex/coin';

jest.setTimeout(60_000);

describe('strategy creating', () => {
  beforeEach(async () => {
    await Test.createTestingModule({
      imports: [CommonServicesModule],
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

  it('create strategy', async () => {
    const userId = 1;
    const tempId = 67;
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
    const symbol = 'DOGE/USDT';
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
      // st.openDealSide = TradeSide.sell;
      await createStrategyFromTemplate(st, exchangeSymbol, tradeType, uea);
    }
  });

  it('create strategies - ms', async () => {
    const userId = 1;
    const ex = ExchangeCode.okx;
    const tradeType = ExTradeType.spot;

    const coins = await Coin.findBy({ stable: false });

    const exchangeSymbols = await ExchangeSymbol.find({
      where: {
        ex,
      },
      relations: ['unifiedSymbol'],
    });
    const esMap = new Map(exchangeSymbols.map((es) => [es.symbol, es]));

    const uea = await UserExAccount.findOneBy({ userId, ex });

    const sts = await StrategyTemplate.find();

    for (const st of sts) {
      for (const coin of coins) {
        const symbol = `${coin.coin}/USDT`;
        const es = esMap.get(symbol);
        if (!es) {
          continue;
        }
        await createStrategyFromTemplate(st, es, tradeType, uea);
      }
    }
  });
});
