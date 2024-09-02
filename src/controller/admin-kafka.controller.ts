import { Controller, Get, Post } from '@nestjs/common';
import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';
import { KafkaClientsService } from '@/data-service/kafka-clients.service';

@Controller('admin/kfk')
export class AdminKafkaController {
  msgNo = 10000;

  constructor(
    private logger: AppLogger,
    private kafkaClientsService: KafkaClientsService,
  ) {
    logger.setContext('admin-kafka');
  }

  @Get('consumers/stats')
  consumersStats(): any {
    return this.kafkaClientsService.getConsumerStats();
  }

  @Get('producer/stats')
  producerStats(): any {
    return this.kafkaClientsService.getProducerStats();
  }

  @Post('sendTestMsg')
  async sendTestMsg() {
    const testProducer = await this.kafkaClientsService.getOrBuildProducer(
      'test1',
      { acks: 0 },
      {
        topics: [],
        loggerContext: 'test-producer',
      },
    );

    await testProducer.forReady();

    this.msgNo++;
    const msg = {
      n: this.msgNo,
      d: new Date().toISOString(),
      r: Math.random(),
    };
    await testProducer.produce('test-1', msg);

    return msg;
  }
}
