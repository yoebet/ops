import { Test } from '@nestjs/testing';
import { UserModule } from '@/user/user-module';
import { UserAccountService } from '@/common-services/user-account.service';

describe('user-account', () => {
  let service: UserAccountService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UserModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(UserAccountService);
  });

  it('hash pass', async () => {
    const pass = '123';
    const hashed = service.hashPass(pass);
    console.log(hashed);
  });

  it('check pass', async () => {
    const pass = '123';
    const hashed =
      '$2b$10$.b374Hqq4ljoQiHzQvMzcuctKh/QkAJsTKRhesgOKJj2UK/t9nkZm';
    // $2b$10$4OO2xKEgT9M01WUBTot3neZ8hL.FXytVZX12HBLAn3mH/J6cSKL5y
    const ok = service.checkPass(pass, hashed);
    console.log(ok);
  });

  it('create user', async () => {
    const username = 'yn';
    const password = '123';
    const user = await service.createUser({
      username,
      password,
    });
    console.log(user);
  });

  it('authenticate user', async () => {
    const username = 'wu';
    const password = '123';
    const user = await service.authenticate(username, password);
    console.log(user);
  });
});
