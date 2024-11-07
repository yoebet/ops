import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { UserExAccount } from '@/db/models/sys/user-ex-account';
import { ExOrder, OrderStatus } from '@/db/models/ex-order';
import { ExApiKey } from '@/exchange/base/rest/rest.type';

@Injectable()
export class ExOrderService {
  constructor(
    private readonly exchanges: Exchanges,
    private logger: AppLogger,
  ) {
    logger.setContext('ExOrderService');
  }

  async syncPendingOrders() {
    const orders = await ExOrder.findBy({
      status: In([OrderStatus.pending, OrderStatus.partialFilled]),
    });
    if (orders.length === 0) {
      return;
    }
    const apiKeys = {};
    for (const order of orders) {
      let apiKey = apiKeys[order.userExAccountId];
      if (!apiKey) {
        const uea = await UserExAccount.findOneBy({
          id: order.userExAccountId,
        });
        apiKey = UserExAccount.buildExApiKey(uea);
        apiKeys[order.userExAccountId] = apiKey;
      }

      await this.syncOrder(apiKey, apiKey);
    }
  }

  async syncOrder(order: ExOrder, apiKey: ExApiKey): Promise<boolean> {
    const tradeService = this.exchanges.getExTradeService(
      order.ex,
      order.tradeType,
    );
    const getAlgoOrder =
      order.algoOrder &&
      (!!order.algoStatus || order.status === OrderStatus.effective);
    const res = await tradeService.getOrder(apiKey, {
      symbol: order.rawSymbol,
      orderId: getAlgoOrder ? order.exAlgoOrderId : order.exOrderId,
      clientOrderId: getAlgoOrder
        ? order.clientAlgoOrderId
        : order.clientOrderId,
      algoOrder: getAlgoOrder,
    });
    if (!res) {
      return false;
    }
    // if (order.exUpdatedAt && res.exUpdatedAt <= order.exUpdatedAt) {
    //   return false;
    // }
    const lastStatus = order.status;
    ExOrder.setProps(order, res);
    if (order.algoStatus === OrderStatus.filled) {
      order.status = OrderStatus.filled;
    }
    const newStatus = order.status;
    await order.save();
    if (newStatus !== lastStatus) {
      this.logger.log(`sync order ${order.id}, ${lastStatus} -> ${newStatus}`);
    } else {
      this.logger.log(`sync order ${order.id}`);
    }
    return true;
  }
}
