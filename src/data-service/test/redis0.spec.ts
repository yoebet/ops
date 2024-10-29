import { Test } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectRedis, RedisModule } from '@nestjs-modules/ioredis';
import { Env } from '@/env';

@Injectable()
class TestRedis1 {
  constructor(@InjectRedis('conn1') private redis: Redis) {}

  async getName() {
    // await this.redis.set('app', 'ops');
    const name = await this.redis.get('app');
    return { name };
  }
}

describe('redis0', () => {
  let tr: TestRedis1;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        RedisModule.forRoot(
          {
            type: 'single',
            options: Env.redis,
          },
          'conn1',
        ),
      ],
      providers: [TestRedis1],
    }).compile();

    // await moduleRef.init();
    tr = moduleRef.get(TestRedis1);
  });

  it('conn', async () => {
    console.log(await tr.getName());
  });
});
