import { Injectable } from '@nestjs/common';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExTradeType } from '@/db/models/exchange-types';
import { UserExAccount } from '@/db/models/user-ex-account';

@Injectable()
export class StrategyService {
  constructor(
    private readonly exchanges: Exchanges,
    private logger: AppLogger,
  ) {
    logger.setContext('StrategyService');
  }

  async start() {
    const ue = await UserExAccount.findOneBy({ id: 1 });
    const tradeService = this.exchanges.getExTradeService(
      ue.ex,
      ExTradeType.spot,
    );
    const os = await tradeService.getAllOpenOrders(
      UserExAccount.buildExApiKey(ue),
      { margin: false },
    );
    // for (const { rawOrder, orderResp } of os) {
    //   // const oid = orderResp.exOrderId;
    // }
    return os;
  }
}
