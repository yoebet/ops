import { Test } from '@nestjs/testing';
import { HistoryDataLoaderModule } from '@/data-loader/history-data-loader.module';
import {
  CreateBatchTaskParams,
  HistoryDataLoaderService,
} from '@/data-loader/history-data-loader.service';
import { In } from 'typeorm';
import { ExchangeCode } from '@/db/models/exchange-types';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import { DateRange, ExSymbolDataTask } from '@/db/models/ex-symbol-data-task';

jest.setTimeout(1000_000);

describe('load-kline-data', () => {
  let service: HistoryDataLoaderService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HistoryDataLoaderModule],
    }).compile();

    await moduleRef.init();
    service = moduleRef.get(HistoryDataLoaderService);
  });

  it('create task', async () => {
    const interval = '1h';
    const dateRange: DateRange = ['2023-08-01', '2023-12-31'];

    const task = await service.createTask({
      ex: ExchangeCode.okx,
      symbol: 'ETH/USDT',
      interval,
      dateRange,
    });
    console.log(`task: ${task.id}`);
  });

  it('create task 2', async () => {
    const interval = '15m';
    const startDate = '2024-11-01';

    const task = await service.createTask({
      ex: ExchangeCode.okx,
      symbol: 'ETH/USDT',
      interval,
      dateRange: [startDate, null],
    });
    console.log(`task: ${task.id}`);
  });

  it('run task', async () => {
    await service.runTask(7);
  });

  it('create batch tasks', async () => {
    const sc: keyof ExchangeSymbol = 'unifiedSymbol';
    const ess = await ExchangeSymbol.find({
      where: {
        // ex: ExchangeCode.binance,
        symbol: In(['BTC/USDT', 'ETH/USDT']),
        // symbol: 'ETH/USDT',
      },
      relations: [sc],
    });

    const intervals = ['4h', '1h', '15m'];
    // const intervals = ['5m', '1m'];
    const dateRanges: DateRange[] = [];
    dateRanges.push(['2024-10', '2024-10']);

    const count = await service.createBatchTasks(ess, intervals, dateRanges, {
      summitJobs: true,
      skipExist: true,
    });
    console.log(`count: ${count}`);
  });

  it('create batch tasks - each month', async () => {
    const sc: keyof ExchangeSymbol = 'unifiedSymbol';
    // BTC,ETH,DOGE,USTC,SOL,FIL
    const ess = await ExchangeSymbol.find({
      where: {
        ex: ExchangeCode.binance,
        // symbol: In(['BTC/USDT', 'ETH/USDT']),
        symbol: 'DOGE/USDT',
      },
      relations: [sc],
    });

    // const intervals = ['4h', '1h', '15m', '5m'];
    const intervals = ['1d', '4h', '1h', '15m'];
    const startDate = '2019-07';
    const endDate = '2024-10';

    const count = await service.createTasksForEachMonth2(
      ess,
      intervals,
      startDate,
      endDate,
      {
        summitJobs: true,
        skipExist: true,
      },
    );
    console.log(`count: ${count}`);
  });

  it('create batch tasks - each day', async () => {
    const sc: keyof ExchangeSymbol = 'unifiedSymbol';
    const ess = await ExchangeSymbol.find({
      where: {
        // ex: ExchangeCode.okx,
        symbol: In(['BTC/USDT', 'ETH/USDT']),
        // symbol: 'ETH/USDT',
      },
      relations: [sc],
    });

    // const intervals = ['4h', '1h', '15m', '5m'];
    const intervals = ['1m'];
    const startDate = '2024-10-01';
    // const endDate = '2018-12-31';
    const endDate = '2024-10-31';
    const count = await service.createTasksForEachDay2(
      ess,
      intervals,
      startDate,
      endDate,
      {
        summitJobs: true,
        skipExist: true,
      },
    );
    console.log(`count: ${count}`);
  });

  it('create batch tasks - each month 2', async () => {
    // BTC,ETH,DOGE,USTC,SOL,FIL

    // const intervals = ['4h', '1h', '15m', '5m'];
    const intervals = ['1d', '4h', '1h', '15m', '5m', '1m'];
    const startDate = '2019-07';
    const endDate = '2024-10';

    const params: CreateBatchTaskParams = {
      exs: [ExchangeCode.binance],
      symbols: ['DOGE/USDT'],
      intervals,
      startDate,
      endDate,
      summitJobs: true,
      skipExist: true,
    };

    const count = await service.createTasksForEachMonth(params);
    console.log(`count: ${count}`);
  });

  it('create batch tasks - each day 2', async () => {
    const intervals = ['5m', '1m'];
    const startDate = '2019-07-01';
    const endDate = '2024-10-31';

    const params: CreateBatchTaskParams = {
      exs: [ExchangeCode.okx],
      symbols: ['DOGE/USDT'],
      intervals,
      startDate,
      endDate,
      summitJobs: true,
      skipExist: true,
    };

    const count = await service.createTasksForEachDay(params);
    console.log(`count: ${count}`);
  });

  it('schedule pending tasks', async () => {
    await service.summitJobs();
  });

  it('re-summit tasks', async () => {
    const tasks = await ExSymbolDataTask.findBy({
      ex: ExchangeCode.okx,
      interval: '5m',
      // symbol: In(['BTC/USDT', 'ETH/USDT']),
    });
    for (const task of tasks) {
      await service.summitJob(task);
    }
  });
});

// npx jest --colors --verbose --testNamePattern="^load-kline-data create batch tasks - each day$" --runTestsByPath ./src/data-loader/test/data-loader.service.spec.ts
