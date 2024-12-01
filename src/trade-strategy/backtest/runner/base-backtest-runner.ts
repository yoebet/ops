import * as _ from 'lodash';
import * as humanizeDuration from 'humanize-duration';
import { AppLogger } from '@/common/app-logger';
import { StrategyJobEnv } from '@/trade-strategy/env/strategy-env';
import { TradeSide } from '@/data-service/models/base';
import { OrderStatus } from '@/db/models/ex-order';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { MINUTE_MS, round, wait } from '@/common/utils/utils';
import { ExitSignal, MVCheckerParams } from '@/trade-strategy/strategy.types';
import { durationHumanizerOptions } from '@/trade-strategy/strategy.utils';
import { BacktestStrategy } from '@/db/models/backtest-strategy';
import { BacktestDeal } from '@/db/models/backtest-deal';
import { BacktestOrder } from '@/db/models/backtest-order';
import {
  PlaceOrderParams,
  PlaceTpslOrderParams,
} from '@/exchange/exchange-service.types';
import { ExTradeType } from '@/db/models/exchange-types';
import { BacktestKlineLevelsData } from '@/trade-strategy/backtest/backtest-kline-levels-data';
import { DateTime } from 'luxon';
import { TimeLevel } from '@/db/models/time-level';
import { KlineDataService } from '@/data-service/kline-data.service';

export interface BacktestTradeOpportunity {
  orderTag?: string;
  side: TradeSide;
  orderPrice: number;
  order?: BacktestOrder;
  params?: PlaceOrderParams;
}

async function createNewDealIfNone(strategy: BacktestStrategy) {
  if (strategy.currentDealId) {
    return;
  }
  const currentDeal = BacktestDeal.newStrategyDeal(strategy);
  await currentDeal.save();
  strategy.currentDealId = currentDeal.id;
  strategy.currentDeal = currentDeal;
  await strategy.save();
}

export abstract class BaseBacktestRunner {
  protected durationHumanizer = humanizeDuration.humanizer(
    durationHumanizerOptions,
  );

  protected klineData: BacktestKlineLevelsData;

  protected constructor(
    protected readonly strategy: BacktestStrategy,
    protected klineDataService: KlineDataService,
    protected jobEnv: StrategyJobEnv,
    protected logger: AppLogger,
  ) {}

  // return exit reason
  async run(): Promise<string> {
    const strategy = this.strategy;

    this.logger.log(`run strategy back-test #${strategy.id} ...`);
    // await this.reportJobStatus('top', `run strategy #${strategy.id} ...`);

    if (!strategy.active) {
      await this.logJob(`strategy ${strategy.id} is not active`);
      return 'not active';
    }

    this.setupStrategyParams();

    await this.logJob(JSON.stringify(strategy.params, null, 2), 'params');

    await this.loadOrCreateDeal();

    await this.backtest();
  }

  protected parseDateTime(dateStr: string): DateTime {
    const pat = 'yyyy-MM-dd';
    return DateTime.fromFormat(dateStr, pat, { zone: 'UTC' });
  }

  protected setupStrategyParams() {
    const strategy = this.strategy;
    const { dataFrom, dataTo } = strategy;

    const startDateTime = this.parseDateTime(dataFrom);
    const endDateTime = this.parseDateTime(dataTo);

    this.klineData = new BacktestKlineLevelsData(
      this.klineDataService,
      strategy.ex,
      strategy.symbol,
      TimeLevel.TL1mTo1d,
      startDateTime,
      endDateTime,
      // 10,
      // 10,
    );
  }

  protected abstract backtest(): Promise<void>;

  protected async logJob(message: string, context?: string): Promise<void> {
    if (context) {
      message = `[${context}] ${message}`;
    }
    this.logger.log(message);
    const job = this.jobEnv.thisJob;
    if (job) {
      await job
        .log(`${new Date().toISOString()} ${message}`)
        .catch((err: Error) => {
          this.logger.error(err);
        });
    }
  }

  protected async reportJobStatus(
    context: string,
    status: string,
  ): Promise<void> {
    this.logger.log(`[${context}] ${status}`);
    const job = this.jobEnv.thisJob;
    if (job) {
      await job.updateProgress({ [context]: status }).catch((err: Error) => {
        this.logger.error(err);
      });
    }
  }

  protected async createNewDeal() {
    await createNewDealIfNone(this.strategy);
  }

  protected async loadOrCreateDeal() {
    const strategy = this.strategy;
    let currentDeal: BacktestDeal;
    if (strategy.currentDealId) {
      currentDeal = await BacktestDeal.findOneBy({
        id: strategy.currentDealId,
      });
      strategy.currentDeal = currentDeal;
      if (!currentDeal) {
        strategy.currentDealId = undefined;
      }
    }
    if (currentDeal) {
      if (currentDeal.status !== 'open') {
        currentDeal = undefined;
        strategy.currentDeal = undefined;
        strategy.currentDealId = undefined;
      }
      const { lastOrderId, pendingOrderId } = currentDeal;
      if (lastOrderId) {
        currentDeal.lastOrder = await BacktestOrder.findOneBy({
          id: lastOrderId,
        });
        if (!currentDeal.lastOrder) {
          currentDeal.lastOrderId = undefined;
        }
      }
      if (currentDeal.pendingOrderId) {
        currentDeal.pendingOrder = await BacktestOrder.findOneBy({
          id: pendingOrderId,
        });
        if (!currentDeal.pendingOrder) {
          currentDeal.pendingOrderId = undefined;
        }
      }
      await currentDeal.save();
      await strategy.save();
    } else {
      await this.createNewDeal();
    }
  }

  protected async closeDeal(deal: BacktestDeal) {
    await this.logJob(`close deal ...`);

    const orders = await BacktestOrder.find({
      select: ['id', 'side', 'execPrice', 'execSize', 'execAmount'],
      where: { dealId: deal.id, status: OrderStatus.filled },
    });
    const cal = (side: TradeSide) => {
      const sideOrders = orders.filter((o) => o.side === side);
      if (sideOrders.length === 1) {
        return [sideOrders[0].execSize, sideOrders[0].execSize];
      }
      const size = _.sumBy(sideOrders, 'execSize');
      const amount = _.sumBy(sideOrders, 'execAmount');
      const avgPrice = amount / size;
      return [size, avgPrice];
    };
    const [buySize, buyAvgPrice] = cal(TradeSide.buy);
    const [sellSize, sellAvgPrice] = cal(TradeSide.sell);
    const settleSize = Math.max(buySize, sellSize);
    // .. USD
    deal.pnlUsd = settleSize * (sellAvgPrice - buyAvgPrice);
    deal.status = 'closed';
    deal.closedAt = new Date();
    await deal.save();

    const strategy = this.strategy;
    strategy.lastDealId = strategy.currentDealId;
    strategy.lastDeal = strategy.currentDeal;
    strategy.currentDealId = undefined;
    strategy.currentDeal = undefined;
    await strategy.save();

    await this.logJob(`deal closed.`);
  }

  protected shouldCloseDeal(currentDeal: BacktestDeal): boolean {
    return !currentDeal.pendingOrderId && !!currentDeal.lastOrder;
  }

  protected async onOrderFilled() {
    const currentDeal = this.strategy.currentDeal;
    if (this.shouldCloseDeal(currentDeal)) {
      return;
    }

    await this.closeDeal(currentDeal);
  }

  protected async ensureExchangeSymbol() {
    const strategy = this.strategy;
    if (!strategy.exchangeSymbol) {
      strategy.exchangeSymbol = await ExchangeSymbol.findOne({
        where: {
          ex: strategy.ex,
          symbol: strategy.symbol,
        },
        relations: ['unifiedSymbol'],
      });
    }
    return strategy.exchangeSymbol;
  }

  protected inverseSide(side: TradeSide): TradeSide {
    return side === TradeSide.buy ? TradeSide.sell : TradeSide.buy;
  }

  protected newClientOrderId(orderTag?: string): string {
    const { id, algoCode } = this.strategy;
    const code = algoCode.toLowerCase();
    const ms = '' + Date.now();
    const tag = orderTag?.replace(/[^a-zA-Z]/, '')?.toLowerCase() || '';
    return `${code}${id}${ms.substring(1, 10)}${tag}`;
  }

  protected newOrderByStrategy(): BacktestOrder {
    const strategy = this.strategy;
    const exOrder = new BacktestOrder();
    exOrder.ex = strategy.ex;
    exOrder.market = strategy.market;
    exOrder.baseCoin = strategy.baseCoin;
    exOrder.symbol = strategy.symbol;
    exOrder.rawSymbol = strategy.rawSymbol;
    exOrder.userExAccountId = strategy.userExAccountId;
    exOrder.strategyId = strategy.id;
    exOrder.dealId = strategy.currentDealId;
    exOrder.tradeType = strategy.tradeType;
    exOrder.paperTrade = strategy.paperTrade;
    return exOrder;
  }

  protected async buildMarketOrder(
    oppo: BacktestTradeOpportunity,
  ): Promise<void> {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;
    const tradeSide = oppo.side;
    const clientOrderId = this.newClientOrderId(oppo.orderTag);

    const params: PlaceOrderParams = {
      side: tradeSide,
      symbol: strategy.rawSymbol,
      priceType: 'market',
      clientOrderId,
      algoOrder: false,
    };

    if (strategy.tradeType === ExTradeType.margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    const size = strategy.baseSize;
    const quoteAmount = strategy.quoteAmount || 200;
    if (size) {
      params.baseSize = round(size, exSymbol.baseSizeDigits);
    } else {
      params.quoteAmount = quoteAmount.toFixed(2);
    }

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = params.priceType;
    if (size) {
      order.baseSize = size;
    }
    order.quoteAmount = size ? undefined : quoteAmount;
    order.algoOrder = false;

    oppo.order = order;
    oppo.params = params;
  }

  protected async buildLimitOrder(
    oppo: BacktestTradeOpportunity,
  ): Promise<void> {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;
    const tradeSide = oppo.side;
    const clientOrderId = this.newClientOrderId(oppo.orderTag);

    const orderPrice = oppo.orderPrice;

    const params: PlaceOrderParams = {
      side: tradeSide,
      symbol: strategy.rawSymbol,
      priceType: 'limit',
      clientOrderId,
      algoOrder: false,
    };

    if (strategy.tradeType === ExTradeType.margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    let size = strategy.baseSize;
    const quoteAmount = strategy.quoteAmount || 200;
    if (!size) {
      if (orderPrice) {
        size = quoteAmount / orderPrice;
      }
    }

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = params.priceType;
    order.limitPrice = orderPrice;
    if (size) {
      order.baseSize = size;
    }
    order.quoteAmount = size ? undefined : quoteAmount;
    order.algoOrder = false;

    oppo.order = order;
    oppo.params = params;
  }

  protected async buildMarketOrLimitOrder(
    oppo: BacktestTradeOpportunity,
  ): Promise<void> {
    if (oppo.order) {
      return this.buildLimitOrder(oppo);
    }
    return this.buildMarketOrder(oppo);
  }

  protected async buildMoveTpslOrder(
    oppo: BacktestTradeOpportunity,
    rps: MVCheckerParams,
  ): Promise<void> {
    const exSymbol = await this.ensureExchangeSymbol();

    const unifiedSymbol = exSymbol.unifiedSymbol;
    const strategy = this.strategy;

    const { activePercent, drawbackPercent } = rps;
    const placeOrderPrice = oppo.orderPrice;
    const tradeSide = oppo.side;

    let activePrice: number;

    if (activePercent) {
      const activeRatio = activePercent / 100;
      if (tradeSide === TradeSide.buy) {
        activePrice = placeOrderPrice * (1 - activeRatio);
      } else {
        activePrice = placeOrderPrice * (1 + activeRatio);
      }
    }

    let size = strategy.baseSize;
    const quoteAmount = strategy.quoteAmount || 200;
    if (!size) {
      if (activePrice) {
        size = quoteAmount / activePrice;
      } else {
        size = quoteAmount / placeOrderPrice;
      }
    }

    const clientOrderId = this.newClientOrderId(oppo.orderTag);

    const params: PlaceTpslOrderParams = {
      side: tradeSide,
      symbol: strategy.rawSymbol,
      priceType: 'limit',
      clientOrderId,
      algoOrder: true,
    };

    if (strategy.tradeType === ExTradeType.margin) {
      params.marginMode = 'cross';
      params.marginCoin = unifiedSymbol.quote;
    }

    params.tpslType = 'move';
    params.baseSize = round(size, exSymbol.baseSizeDigits);
    params.moveDrawbackRatio = (drawbackPercent / 100).toFixed(4);
    if (activePrice) {
      const priceDigits = exSymbol.priceDigits;
      params.moveActivePrice = round(activePrice, priceDigits);
    }

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = params.priceType;
    if (size) {
      order.baseSize = size;
    }
    order.quoteAmount = size ? undefined : quoteAmount;
    order.algoOrder = true;
    order.tpslType = params.tpslType;
    order.moveDrawbackPercent = drawbackPercent;
    if (activePrice) {
      order.moveActivePrice = activePrice;
    }

    oppo.order = order;
    oppo.params = params;
  }
}
