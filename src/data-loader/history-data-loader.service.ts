import { Injectable, OnModuleInit } from '@nestjs/common';
import { DateTime, DateTimeOptions } from 'luxon';
import { AppLogger } from '@/common/app-logger';
import { TaskScope } from '@/common/server-profile.type';
import { ExchangeRestService } from '@/exchange/exchange-rest.service';
import { ExchangeSymbol } from '@/db/models/exchange-symbol';
import {
  ExAccountCode,
  ExchangeCode,
  ExKline,
} from '@/exchange/exchanges-types';
import {
  DataTaskStatus,
  DateRange,
  ExSymbolDataTask,
} from '@/db/models/ex-symbol-data-task';
import { ExchangeService } from '@/exchange/rest-capacities';
import { KlineDataService } from '@/data-service/kline-data.service';
import { Kline } from '@/db/models-data/kline';
import { chunk } from 'lodash';
import { JobFacade, JobsService } from '@/job/jobs.service';
import { Job } from 'bullmq';
import { FindOptionsWhere } from 'typeorm/find-options/FindOptionsWhere';
import { ExSymbolEnabled } from '@/db/models/ex-symbol-enabled';
import { In } from 'typeorm';

export const DateTimeOpts: DateTimeOptions = { zone: 'UTC' };
const ymPattern = 'yyyy-MM';
const ymdPattern = 'yyyy-MM-dd';

export interface CreateBatchTaskParams {
  exs: ExchangeCode[];
  symbols: string[];
  intervals: string[];
  startDate: string;
  endDate: string;
  summitJobs?: boolean;
  skipExist?: boolean;
}

interface LoaderJobData {
  taskId: number;
  memo: string;
}

interface TaskResult {
  klines?: number;
  // saved?: number;
}

declare type LoaderTaskFacade = JobFacade<LoaderJobData, TaskResult>;

@Injectable()
export class HistoryDataLoaderService implements OnModuleInit {
  private jobFacades = new Map<string, LoaderTaskFacade>();

  constructor(
    readonly dataService: KlineDataService,
    readonly exchangeRestService: ExchangeRestService,
    readonly jobsService: JobsService,
    readonly logger: AppLogger,
  ) {
    logger.setContext('data-loader');
  }

  onModuleInit() {
    this.logger.log('define jobs ...');
    for (const ex of Object.values(ExchangeCode)) {
      const queueName = this.getQueueName(ex);
      this.defineLoaderJob(queueName);
    }
    // this.defineLoaderJob(`load-kline/okx/15m`);
  }

  private getQueueName(ex: ExchangeCode) {
    return `kline/${ex}`;
  }

  private defineLoaderJob(queueName: string): LoaderTaskFacade {
    const loader = this;
    const jobFacade = this.jobsService.defineJob<LoaderJobData, TaskResult>({
      queueName,
      async processJob(
        job: Job<LoaderJobData, TaskResult>,
      ): Promise<TaskResult> {
        return loader.runTask(job.data.taskId);
      },
    });
    this.jobFacades.set(queueName, jobFacade);
    return jobFacade;
  }

  private getJobFacade(ex: ExchangeCode): LoaderTaskFacade {
    const queueName = this.getQueueName(ex);
    let jobFacade = this.jobFacades.get(queueName);
    if (!jobFacade) {
      jobFacade = this.defineLoaderJob(queueName);
    }
    return jobFacade;
  }

  async start(_profile: TaskScope) {
    this.logger.log(`:::: start ...`);
  }

  private newDataTask(
    es: ExchangeSymbol,
    interval: string,
    [startDate, endDate]: DateRange,
  ) {
    const task = new ExSymbolDataTask();
    task.ex = es.ex;
    task.symbol = es.symbol;
    task.rawSymbol = es.rawSymbol;
    task.exAccount = es.exAccount;
    task.market = es.market;
    task.interval = interval;
    task.startDate = startDate;
    task.endDate = endDate;
    task.taskType = 'load';
    task.dataType = 'kline';
    // task.params = {};
    task.status = DataTaskStatus.pending;
    return task;
  }

  async createTask(options: {
    ex: ExchangeCode;
    symbol: string;
    interval: string;
    dateRange: DateRange;
    summitJob?: boolean;
  }) {
    const { ex, symbol, interval, dateRange, summitJob } = options;

    const es = await ExchangeSymbol.findOneBy({
      ex,
      symbol,
    });
    if (!es) {
      throw new Error(`no symbol for ${ex} ${symbol}`);
    }

    const task = this.newDataTask(es, interval, dateRange);
    await ExSymbolDataTask.save(task);
    if (summitJob) {
      await this.summitJob(task);
    }

    return task;
  }

  async createBatchTasks(
    ess: ExchangeSymbol[],
    intervals: string[],
    dateRanges: DateRange[],
    opts: { summitJobs?: boolean; skipExist?: boolean },
  ) {
    let count = 0;
    for (const interval of intervals) {
      for (const es of ess) {
        for (const dateRange of dateRanges) {
          if (opts.skipExist) {
            const ks: FindOptionsWhere<ExSymbolDataTask> = {
              ex: es.ex,
              symbol: es.symbol,
              interval,
              startDate: dateRange[0],
              endDate: dateRange[1],
            };
            const exist = await ExSymbolDataTask.existsBy(ks);
            if (exist) {
              this.logger.log(JSON.stringify(ks, null, 2));
              this.logger.log(`existed, skip`);
              continue;
            }
          }
          const task = this.newDataTask(es, interval, dateRange);
          await ExSymbolDataTask.save(task);
          count++;
          if (opts.summitJobs) {
            await this.summitJob(task);
          }
        }
      }
    }
    return count;
  }

  private async findExSymbols(params: CreateBatchTaskParams) {
    const sc: keyof ExSymbolEnabled = 'unifiedSymbol';
    return await ExSymbolEnabled.find({
      where: {
        ex: In(params.exs),
        symbol: In(params.symbols),
      },
      relations: [sc],
    });
  }

  async createTasksForEachMonth(params: CreateBatchTaskParams) {
    const ess = await this.findExSymbols(params);
    return this.createTasksForEachMonth2(
      ess,
      params.intervals,
      params.startDate,
      params.endDate,
      { summitJobs: params.summitJobs, skipExist: params.skipExist },
    );
  }

  async createTasksForEachMonth2(
    ess: ExchangeSymbol[],
    intervals: string[],
    startDate: string,
    endDate: string,
    opts: { summitJobs?: boolean; skipExist?: boolean },
  ) {
    let date = DateTime.fromFormat(startDate, ymPattern, DateTimeOpts);
    const endTs = DateTime.fromFormat(
      endDate,
      ymPattern,
      DateTimeOpts,
    ).toMillis();
    let count = 0;
    while (date.toMillis() <= endTs) {
      const dateStr = date.toFormat(ymPattern);
      const dateRange: DateRange = [dateStr, dateStr];
      count += await this.createBatchTasks(ess, intervals, [dateRange], opts);
      date = date.plus({ month: 1 });
    }
    return count;
  }

  async createTasksForEachDay(params: CreateBatchTaskParams) {
    const ess = await this.findExSymbols(params);
    return this.createTasksForEachDay2(
      ess,
      params.intervals,
      params.startDate,
      params.endDate,
      { summitJobs: params.summitJobs, skipExist: params.skipExist },
    );
  }

  async createTasksForEachDay2(
    ess: ExchangeSymbol[],
    intervals: string[],
    startDate: string,
    endDate: string,
    opts: { summitJobs?: boolean; skipExist?: boolean },
  ) {
    let date = DateTime.fromFormat(startDate, ymdPattern, DateTimeOpts);
    const endTs = DateTime.fromFormat(
      endDate,
      ymdPattern,
      DateTimeOpts,
    ).toMillis();
    let count = 0;
    while (date.toMillis() <= endTs) {
      const dateStr = date.toFormat(ymdPattern);
      const dateRange: DateRange = [dateStr, dateStr];
      count += await this.createBatchTasks(ess, intervals, [dateRange], opts);
      date = date.plus({ day: 1 });
    }
    return count;
  }

  async summitJobs() {
    let count = 0;
    const pendingTasks = await ExSymbolDataTask.find({
      where: {
        status: DataTaskStatus.pending, // or aborted
      },
    });
    for (const task of pendingTasks) {
      await this.summitJob(task);
      count++;
    }
    return count;
  }

  async summitJob(task: ExSymbolDataTask) {
    const jobFacade = this.getJobFacade(task.ex);
    await jobFacade.addTask(
      {
        taskId: task.id,
        memo: `${task.ex}, ${task.symbol}, ${task.interval} (${task.startDate} ~ ${task.endDate})`,
      },
      // {
      //   jobId: `${task.id}-1`,
      // },
    );
  }

  async runTask(taskId: number): Promise<TaskResult> {
    const task = await ExSymbolDataTask.findOne({
      where: { id: taskId },
      relations: ['unifiedSymbol'],
    });
    if (!task) {
      throw new Error(`task #${taskId} not found.`);
    }
    if (task.status === DataTaskStatus.completed) {
      this.logger.log(`task #${taskId} completed.`);
      return {};
    }
    if (task.status === DataTaskStatus.canceled) {
      throw new Error(`task #${taskId} was canceled.`);
    }
    if (task.status === DataTaskStatus.aborted) {
      this.logger.log(`task #${taskId} resume ...`);
    }
    task.status = DataTaskStatus.running;

    try {
      return this.doRunTask(task);
    } catch (e) {
      task.status = DataTaskStatus.aborted;
      await task.save();

      this.logger.error(e);
      throw e;
    }
  }

  private parseYmd(dateStr: string) {
    return DateTime.fromFormat(
      dateStr,
      dateStr.length === 10 ? ymdPattern : ymPattern,
      DateTimeOpts,
    );
  }

  protected async doRunTask(task: ExSymbolDataTask): Promise<TaskResult> {
    const rest = this.exchangeRestService.getExRest(
      task.ex === ExchangeCode.binance
        ? ExAccountCode.binanceSpot
        : task.exAccount,
    );
    if (!rest) {
      throw Error('no exchange service.');
    }

    const { startDate, endDate, lastDate } = task;

    if (!lastDate && !startDate) {
      throw Error('no startDate.');
    }

    let dt: DateTime;
    if (lastDate) {
      dt = this.parseYmd(lastDate).plus({ day: 1 });
    } else {
      dt = this.parseYmd(startDate);
    }

    const runTo = endDate
      ? this.parseYmd(endDate).toMillis()
      : DateTime.utc().minus({ day: 1 }).startOf('day').toMillis();

    const beginningOfThisMonth = DateTime.utc().startOf('month').toMillis();

    let gotKlines = 0;

    while (dt.toMillis() <= runTo) {
      let result;
      if (
        task.startDate.length > 7 || // yyyy-MM-dd
        dt.toMillis() >= beginningOfThisMonth
      ) {
        result = await this.loadHistoryKlinesOneDay(task, dt, rest);
        task.lastDate = dt.endOf('month').toFormat(ymdPattern);
        await task.save();

        dt = dt.plus({ day: 1 });
      } else {
        result = await this.loadHistoryKlinesOneMonth(task, dt, rest);
        task.lastDate = dt.endOf('month').toFormat(ymdPattern);
        await task.save();

        dt = dt.plus({ month: 1 }).startOf('month');
      }
      gotKlines += result.klines;
    }

    if (dt.toMillis() > runTo) {
      task.status = DataTaskStatus.completed;
      task.completedAt = new Date();
    }
    await task.save();

    return { klines: gotKlines };
  }

  protected async loadHistoryKlinesOneMonth(
    task: ExSymbolDataTask,
    dt: DateTime,
    rest: ExchangeService,
  ): Promise<TaskResult> {
    const { interval, symbol, rawSymbol, exAccount } = task;
    const yearMonth = dt.toFormat(ymPattern);
    this.logger.log(`loading ${task.symbol} ${task.interval} ${yearMonth}`);

    const klines = await rest.loadHistoryKlinesOneMonth({
      exAccount,
      yearMonth,
      interval,
      symbol: rawSymbol,
    });

    await this.saveKlines(task, klines);

    this.logger.log(`loaded ${symbol} ${interval} ${yearMonth}`);

    return { klines: klines.length };
  }

  protected async loadHistoryKlinesOneDay(
    task: ExSymbolDataTask,
    dt: DateTime,
    rest: ExchangeService,
  ): Promise<TaskResult> {
    const { interval, symbol, rawSymbol, exAccount } = task;
    const dateStr = dt.toFormat(ymdPattern);
    this.logger.log(`loading ${task.symbol} ${task.interval} ${dateStr}`);

    const klines = await rest.loadHistoryKlinesOneDay({
      exAccount,
      date: dateStr,
      interval,
      symbol: rawSymbol,
    });

    await this.saveKlines(task, klines);

    this.logger.log(`loaded ${symbol} ${interval} ${dateStr}`);

    return { klines: klines.length };
  }

  protected async saveKlines(task: ExSymbolDataTask, klines: ExKline[]) {
    const { interval, symbol, unifiedSymbol } = task;
    const kls: Kline[] = klines.map((k) => ({
      ex: task.ex,
      interval,
      base: unifiedSymbol.base,
      quote: unifiedSymbol.quote,
      market: unifiedSymbol.market,
      symbol,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      tds: k.tds,
      size: k.size,
      amount: k.amount,
      // bc: k.bc,
      bc: null,
      ba: k.ba ?? null,
      bs: k.bs ?? null,
      // sc: k.sc,
      sc: null,
      sa: k.sa ?? null,
      ss: k.ss ?? null,
      time: new Date(k.ts),
    }));

    let totalSaved = 0;
    const chunks = chunk(kls, 500);
    for (const klChunk of chunks) {
      const saved = await this.dataService.saveKlines(interval, klChunk, {
        updateOnConflict: true,
      });
      totalSaved += saved;
      this.logger.log(`saved: ${saved}`);
    }
    return totalSaved;
  }
}
