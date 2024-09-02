import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { DbModule } from '@/db/db-module';
import { wait } from '@/common/utils/utils';
import { Trade } from '@/db/models/trade';
import { ExchangeCode } from '@/exchange/exchanges-types';
import { And, LessThan, MoreThan } from 'typeorm';

jest.setTimeout(500_000);

describe('trade-data', () => {
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule, DbModule],
    }).compile();

    await moduleRef.init();
  });

  describe('query', () => {
    it('find next one', async () => {
      const result = await Trade.find({
        where: {
          ex: ExchangeCode.okx,
          symbol: 'BTC/USDT',
          time: MoreThan(new Date('2024-08-31 09:02:48.183000 +00:00')),
        },
        order: { time: 'asc' },
        take: 1,
      });
      console.log(result);
    });

    it('find previous one', async () => {
      const tradeTime = new Date('2024-08-31T09:02:48.203Z');
      const backToTime = new Date(tradeTime.getTime() - 12 * 60 * 60 * 1000);
      const result = await Trade.findOne({
        select: ['tradeId', 'time'],
        where: {
          ex: ExchangeCode.okx,
          symbol: 'BTC/USDT',
          time: And(LessThan(tradeTime), MoreThan(backToTime)),
        },
        order: { time: 'desc' },
      });
      console.log(result);
    });
  });
});
