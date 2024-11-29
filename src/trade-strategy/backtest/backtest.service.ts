import { AppLogger } from '@/common/app-logger';
import { JobsService } from '@/job/jobs.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BacktestService {
  constructor(
    private jobsService: JobsService,
    private logger: AppLogger,
  ) {
    logger.setContext('backtest');
  }

  start() {
    this.logger.log(`:::: start ...`);
  }
}
