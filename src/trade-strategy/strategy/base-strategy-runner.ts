import { AppLogger } from '@/common/app-logger';
import { Strategy } from '@/db/models/strategy';
import { StrategyEnv } from '@/trade-strategy/env/strategy-env';
import { StrategyDeal } from '@/db/models/strategy-deal';
import { TradeSide } from '@/data-service/models/base';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import * as _ from 'lodash';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';

export abstract class BaseStrategyRunner {
  protected constructor(
    protected readonly strategy: Strategy,
    protected helper: StrategyEnv,
    protected logger: AppLogger,
  ) {}

  abstract start(): Promise<void>;

  async stop() {}

  protected async createNewDeal() {
    const strategy = this.strategy;
    const currentDeal = StrategyDeal.newStrategyDeal(strategy);
    await StrategyDeal.save(currentDeal);
    strategy.currentDealId = currentDeal.id;
    strategy.currentDeal = currentDeal;
    strategy.nextTradeSide = TradeSide.buy;
    return currentDeal;
  }

  protected async loadOrCreateDeal() {
    const strategy = this.strategy;
    let currentDeal: StrategyDeal;
    if (strategy.currentDealId) {
      currentDeal = await StrategyDeal.findOneBy({
        id: strategy.currentDealId,
      });
      if (currentDeal) {
        if (currentDeal.status !== 'open') {
          currentDeal = undefined;
          strategy.currentDeal = undefined;
          strategy.currentDealId = undefined;
        }
      }
    }
    if (currentDeal) {
      const { lastOrderId, pendingOrderId } = currentDeal;
      if (lastOrderId) {
        currentDeal.lastOrder = await ExOrder.findOneBy({
          id: lastOrderId,
        });
      }
      if (currentDeal.pendingOrderId) {
        currentDeal.pendingOrder = await ExOrder.findOneBy({
          id: pendingOrderId,
        });
      }
    } else {
      await this.createNewDeal();
    }
  }

  protected async closeDeal(deal: StrategyDeal) {
    const orders = await ExOrder.find({
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
    await deal.save();
  }

  protected async processPendingOrder() {
    const strategy = this.strategy;
    const currentDeal = strategy.currentDeal;
    if (!currentDeal?.pendingOrder) {
      return;
    }
    if (ExOrder.orderFinished(currentDeal.pendingOrder.status)) {
      currentDeal.lastOrder = currentDeal.pendingOrder;
      await currentDeal.save();
    } else {
      const pendingOrder = currentDeal.pendingOrder;
      if (pendingOrder.status === OrderStatus.notSummited) {
        // discard
        currentDeal.pendingOrder = undefined;
        currentDeal.pendingOrderId = undefined;
        await currentDeal.save();
        return;
      }
      // check is market price
      const waitSeconds = pendingOrder.priceType === 'market' ? 8 : 10 * 60;
      const order = await this.helper.waitForOrder(pendingOrder, waitSeconds);
      if (order) {
        // finished
        if (order.status === OrderStatus.filled) {
          currentDeal.lastOrder = order;
          currentDeal.lastOrderId = order.id;
        }
        await currentDeal.save();
      } else {
        // timeout
        await this.helper.trySynchronizeOrder(pendingOrder);
        if (ExOrder.orderFinished(pendingOrder.status)) {
          currentDeal.lastOrder = pendingOrder;
          currentDeal.pendingOrder = undefined;
          currentDeal.pendingOrderId = undefined;
          await currentDeal.save();
        } else {
          // TODO:
          return;
        }
      }
    }
    currentDeal.pendingOrder = undefined;
    currentDeal.pendingOrderId = undefined;

    await this.onOrderFilled();

    await strategy.save();
  }

  protected async onOrderFilled() {
    const currentDeal = this.strategy.currentDeal;
    const lastOrder = currentDeal.lastOrder;
    if (
      !lastOrder ||
      lastOrder.status !== OrderStatus.filled ||
      lastOrder.side === TradeSide.buy
    ) {
      return;
    }

    await this.closeDeal(currentDeal);

    await this.createNewDeal();
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

  protected newClientOrderId(): string {
    const code = this.strategy.templateCode.toLowerCase();
    return `${code}${Math.round(Date.now() / 1000) - 1e9}`;
  }

  protected newOrderByStrategy(): ExOrder {
    const strategy = this.strategy;
    const exOrder = new ExOrder();
    exOrder.userExAccountId = strategy.userExAccountId;
    exOrder.strategyId = strategy.id;
    exOrder.dealId = strategy.currentDealId;
    exOrder.side = strategy.nextTradeSide;
    exOrder.tradeType = strategy.tradeType;
    exOrder.paperTrade = strategy.paperTrade;
    return exOrder;
  }
}
