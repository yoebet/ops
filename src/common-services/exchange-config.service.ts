import { Injectable } from '@nestjs/common';
import { ExchangeConfig } from '@/db/models/exchange-config';
import { AppLogger } from '@/common/app-logger';

@Injectable()
export class ExchangeConfigService {
  constructor(private logger: AppLogger) {
    logger.setContext('ExchangeConfigService');
  }

  getExchangeConfigs(): Promise<ExchangeConfig[]> {
    this.logger.verbose(`get exchange configs`);
    return ExchangeConfig.find({
      order: {
        displayOrder: 'ASC',
      },
    });
  }
}
