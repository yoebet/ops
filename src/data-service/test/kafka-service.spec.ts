import { Test } from '@nestjs/testing';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { wait } from '@/common/utils/utils';
import { KafkaClientsService } from '@/data-service/kafka-clients.service';

jest.setTimeout(500_000);

describe('kafka-service', () => {
  let service: KafkaClientsService;
  const topic = 'test-ks';

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemConfigModule],
      providers: [KafkaClientsService],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(KafkaClientsService);
  });

  it('produce', async () => {
    const producer = await service.getOrBuildProducer(
      'p1',
      {},
      { topics: [topic] },
    );
    await producer.produce(topic, 'test-message 1');
    await wait(3000);
    await producer.produce(topic, 'test-message 2');
    await wait(3000);
    await producer.produce(topic, 'test-message 3');
    await wait(500_000);
  });

  it('consume', async () => {
    const consumer = service.getOrBuildConsumer(
      'c1',
      {
        'auto.offset.reset': 'earliest',
      },
      { topics: [topic] },
    );
    consumer.getSubject(topic).subscribe(console.log);
    await wait(500_000);
  });
});
