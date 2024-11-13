import { Injectable } from '@nestjs/common';
import { Exchanges } from '@/exchange/exchanges';
import { AppLogger } from '@/common/app-logger';
import { ExchangeCode, ExTradeType } from '@/db/models/exchange-types';
import { UserExAccount } from '@/db/models/user-ex-account';

@Injectable()
export class ExOrderService {
  constructor(
    private readonly exchangeRestService: Exchanges,
    private logger: AppLogger,
  ) {
    logger.setContext('ExOrderService');
  }

  async syncPendingOrders() {
    const ue = await UserExAccount.findOneBy({ id: 1 });
    const rest = this.exchangeRestService.getExTradeService(
      ExchangeCode.okx,
      ExTradeType.spot,
    );
    const os = await rest.getAllOpenOrders(
      {
        key: ue.apikeyKey,
        secret: ue.apikeySecret,
        password: ue.apikeyPassword,
      },
      { margin: false },
    );
    for (const { rawOrder, orderResp } of os) {
      // const oid = orderResp.exOrderId;
    }
  }
}
