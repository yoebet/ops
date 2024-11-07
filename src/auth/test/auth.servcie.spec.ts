import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from '@/auth/auth.module';

describe('auth-service', () => {
  let jwtService: JwtService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    await moduleRef.init();
    jwtService = moduleRef.get(JwtService);
  });

  it('sign', async () => {
    const token = jwtService.sign({ a: 1, b: 2 });
    console.log(token);
    const obj = jwtService.decode(token);
    console.log(obj);
  });
});
