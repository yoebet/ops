import { DateTime } from 'luxon';
import * as humanizeDuration from 'humanize-duration';
import { AppLogger } from '@/common/app-logger';
import { StrategyJobEnv } from '@/strategy/env/strategy-env';
import { TradeSide } from '@/data-service/models/base';
import { OrderStatus, OrderTag } from '@/db/models/ex-order';
import { ExchangeSymbol } from '@/db/models/ex/exchange-symbol';
import { ConsiderSide, MVCheckerParams } from '@/strategy/strategy.types';
import {
  durationHumanizerOptions,
  evalOrdersPnl,
} from '@/strategy/strategy.utils';
import { BacktestStrategy } from '@/db/models/strategy/backtest-strategy';
import { BacktestDeal } from '@/db/models/strategy/backtest-deal';
import { BacktestOrder } from '@/db/models/strategy/backtest-order';
import { BacktestKlineLevelsData } from '@/strategy-backtest/backtest-kline-levels-data';
import { TimeLevel } from '@/db/models/time-level';
import { KlineDataService } from '@/data-service/kline-data.service';
import { StrategyDeal } from '@/db/models/strategy/strategy-deal';

export interface CheckOppoOptions {
  kld: BacktestKlineLevelsData;
  considerSide: ConsiderSide;
  stopLossPrice?: number;
  closeSide?: TradeSide;
  tsTo?: number;
}

export interface BacktestTradeOppo {
  orderTag?: OrderTag;
  side?: TradeSide;
  orderPrice?: number;
  orderSize?: number;
  orderAmount?: number;
  orderTime?: Date;
  order?: BacktestOrder;
  // params?: PlaceOrderParams;
  moveOn?: boolean;
  reachStopLossPrice?: boolean;
  reachTimeLimit?: boolean;
  memo?: string;
}

async function createNewDealIfNone(
  strategy: BacktestStrategy,
  openTs?: number,
) {
  if (strategy.currentDealId) {
    return;
  }
  const currentDeal = BacktestDeal.newStrategyDeal(strategy);
  if (openTs) {
    currentDeal.openAt = new Date(openTs);
  }
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

  protected async loadOrCreateDeal(klineOpenTs: number) {
    const strategy = this.strategy;
    let currentDeal: BacktestDeal;
    if (strategy.currentDealId) {
      currentDeal = await BacktestDeal.findOneBy({
        id: strategy.currentDealId,
      });
      strategy.currentDeal = currentDeal;
      if (!currentDeal) {
        strategy.currentDealId = null;
      }
    }
    if (currentDeal && currentDeal.status !== 'open') {
      currentDeal = null;
      strategy.currentDeal = null;
      strategy.currentDealId = null;
      await strategy.save();
    }
    if (currentDeal) {
      const { lastOrderId, pendingOrderId } = currentDeal;
      if (lastOrderId) {
        const lastOrder = await BacktestOrder.findOneBy({
          id: lastOrderId,
        });
        StrategyDeal.setLastOrder(currentDeal, lastOrder);
      }
      if (currentDeal.pendingOrderId) {
        const pendingOrder = await BacktestOrder.findOneBy({
          id: pendingOrderId,
        });
        StrategyDeal.setPendingOrder(currentDeal, pendingOrder);
      }
      await currentDeal.save();
      await strategy.save();
    } else {
      await createNewDealIfNone(this.strategy, klineOpenTs);
    }
  }

  protected async closeDeal(deal: BacktestDeal) {
    await this.logJob(`close deal ...`);

    const orders = await BacktestOrder.find({
      select: ['id', 'side', 'execPrice', 'execSize', 'execAmount'],
      where: { dealId: deal.id, status: OrderStatus.filled },
      order: { exUpdatedAt: 'asc' },
    });
    deal.pnlUsd = evalOrdersPnl(orders);
    deal.status = 'closed';
    deal.closedAt = deal.lastOrder?.exUpdatedAt;
    if (deal.closedAt && deal.openAt) {
      const msSpan = deal.closedAt.getTime() - deal.openAt.getTime();
      deal.dealDuration = this.durationHumanizer(msSpan, { round: true });
    }
    deal.ordersCount = orders.length;
    deal.closeReason = deal.lastOrder?.tag;
    await deal.save();

    const strategy = this.strategy;
    if (strategy.currentDealId === deal.id) {
      strategy.lastDealId = strategy.currentDealId;
      strategy.lastDeal = strategy.currentDeal;
      strategy.currentDealId = null;
      strategy.currentDeal = null;
    }
    await strategy.save();

    await this.logJob(`deal closed.`);
  }

  protected shouldCloseDeal(currentDeal: BacktestDeal): boolean {
    return (
      !currentDeal.pendingOrderId &&
      currentDeal.lastOrder &&
      currentDeal.lastOrder.tag !== 'open'
    );
  }

  protected async onOrderFilled() {
    const currentDeal = this.strategy.currentDeal;
    if (!this.shouldCloseDeal(currentDeal)) {
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
    const { id } = this.strategy;
    const tag = orderTag?.replace(/[^a-zA-Z]/, '')?.toLowerCase() || '';
    return `${id}${Date.now()}${tag}`;
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

  protected async buildMarketOrder(oppo: BacktestTradeOppo): Promise<void> {
    const strategy = this.strategy;
    const tradeSide = oppo.side;
    const clientOrderId = this.newClientOrderId(oppo.orderTag);

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = 'market';
    if (tradeSide === TradeSide.buy) {
      order.quoteAmount = oppo.orderAmount || strategy.quoteAmount;
    } else {
      order.baseSize = oppo.orderSize || strategy.baseSize;
    }
    order.algoOrder = false;
    order.memo = oppo.memo;

    oppo.order = order;
  }

  protected async buildLimitOrder(oppo: BacktestTradeOppo): Promise<void> {
    const strategy = this.strategy;
    const tradeSide = oppo.side;
    const clientOrderId = this.newClientOrderId(oppo.orderTag);
    const orderPrice = oppo.orderPrice;

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = 'limit';
    order.limitPrice = orderPrice;
    if (tradeSide === TradeSide.buy) {
      order.quoteAmount = oppo.orderAmount || strategy.quoteAmount;
    } else {
      order.baseSize = oppo.orderSize || strategy.baseSize;
    }
    order.algoOrder = false;
    order.memo = oppo.memo;

    oppo.order = order;
  }

  protected async buildMoveTpslOrder(
    oppo: BacktestTradeOppo,
    rps: MVCheckerParams,
  ): Promise<void> {
    const strategy = this.strategy;

    const { activePercent, drawbackPercent } = rps;
    const tradeSide = oppo.side;

    const clientOrderId = this.newClientOrderId(oppo.orderTag);

    const order = this.newOrderByStrategy();
    order.tag = oppo.orderTag;
    order.side = tradeSide;
    order.status = OrderStatus.notSummited;
    order.clientOrderId = clientOrderId;
    order.priceType = 'limit';
    order.algoOrder = true;
    order.tpslType = 'move';
    order.moveDrawbackPercent = drawbackPercent;
    if (tradeSide === TradeSide.buy) {
      order.quoteAmount = oppo.orderAmount || strategy.quoteAmount;
    } else {
      order.baseSize = oppo.orderSize || strategy.baseSize;
    }
    if (activePercent) {
      const orderPrice = oppo.orderPrice;
      const activeRatio = activePercent / 100;
      if (tradeSide === TradeSide.buy) {
        order.moveActivePrice = orderPrice * (1 - activeRatio);
      } else {
        order.moveActivePrice = orderPrice * (1 + activeRatio);
      }
    }
    order.memo = oppo.memo;

    oppo.order = order;
  }
}
