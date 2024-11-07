import { Test } from '@nestjs/testing';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { ExchangeCode } from '@/db/models/exchange-types';
import { User } from '@/db/models/sys/user';
import { UserExAccount } from '@/db/models/sys/user-ex-account';

jest.setTimeout(60_000);

describe('user-ex-account', () => {
  beforeEach(async () => {
    await Test.createTestingModule({
      imports: [CommonServicesModule],
    }).compile();
  });

  it('create user', async () => {
    const user = new User();
    user.name = 'wu';
    await user.save();
  });

  it('create user-ex-account', async () => {
    const userId = 1;
    for (const ex of [ExchangeCode.okx, ExchangeCode.binance]) {
      const ue = new UserExAccount();
      ue.userId = userId;
      ue.ex = ex;
      ue.name = `${ue.ex}-1`;
      ue.apikeyKey = '';
      ue.apikeySecret = '';
      await ue.save();
    }
  });
});
