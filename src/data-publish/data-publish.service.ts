import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Rx from 'rxjs';
import { AppLogger } from '@/common/app-logger';
import { TimeLevel } from '@/db/models/time-level';
import { wait } from '@/common/utils/utils';
import { MarketDataService } from '@/data-service/market-data.service';
import { Kline } from '@/db/models-data/kline';
import { DataChannelService } from '@/data-service/data-channel.service';
import { TaskScope } from '@/common/server-profile.type';

export interface TaskExecution {
  triggerSrc: string;
  startTs: number;
  finishedTs?: number;
  success?: boolean;
  lastKlineTs?: number;
  toKlineTs?: number;
  klinesCount?: number;
}

export interface PublishTask {
  taskKey: string;
  dataTable: string;
  timeLevel: TimeLevel;
  prl?: number;
  lowerTimeLevel?: TimeLevel;
  lowerTask?: PublishTask;
  higherTasks?: PublishTask[];
  dummy: boolean;

  trigger: Rx.Subject<'init' | 'timer' | 'lower' | 'manual'>;

  running?: boolean;
  execution?: TaskExecution;
  uptoKlTs?: number;
  klines?: Kline[];
  accumulatedKlines: number;
}

function newPublishTask(): PublishTask {
  return {
    taskKey: undefined,
    timeLevel: undefined,
    lowerTimeLevel: undefined,
    dataTable: undefined,
    dummy: false,

    running: false,
    trigger: new Rx.Subject(),
    lowerTask: undefined,
    higherTasks: [],
    accumulatedKlines: 0,
  };
}

@Injectable()
export class DataPublishService implements OnModuleInit {
  timeLevelMap: Map<string, TimeLevel> = new Map<string, TimeLevel>();

  publishTaskMap: Map<string, PublishTask> = new Map();

  publishTasks: PublishTask[] = [];

  readonly intervalSecondsFrom: number = 5;
  readonly intervalSecondsTo: number = 4 * 60 * 60;

  constructor(
    private marketDataService: MarketDataService,
    private channelService: DataChannelService,
    private logger: AppLogger,
  ) {
    logger.setContext('data-publisher');
  }

  protected genTaskKey(interval: string, prl?: number) {
    return prl ? `fp_${interval}_p${prl}` : `kl_${interval}`;
  }

  protected buildFpTaskHierarchy(
    tlDirectLowerMap: Map<string, string>,
    timeLevel: TimeLevel,
  ) {
    const { interval, intervalSeconds, rollupFromInterval, prlFrom, prlTo } =
      timeLevel;

    const directLowerInterval = tlDirectLowerMap.get(interval);
    const lowerInterval = directLowerInterval || rollupFromInterval;
    let basePrl = 1;
    for (let prl = 1; prl <= prlTo; prl *= 2) {
      const lowerTimeLevel = this.timeLevelMap.get(lowerInterval);
      const taskKey = this.genTaskKey(interval, prl);
      const dataTable = this.marketDataService.getFootprintDatasource(
        interval,
        prl,
      );
      const trt: PublishTask = {
        ...newPublishTask(),
        taskKey,
        dummy: intervalSeconds < this.intervalSecondsFrom || prl < prlFrom,
        timeLevel,
        lowerTimeLevel,
        dataTable,
        prl,
      };
      this.publishTaskMap.set(taskKey, trt);
      this.publishTasks.push(trt);

      const fromInterval = prl === 1 ? lowerInterval : interval;
      const lowerTaskKey = this.genTaskKey(fromInterval, basePrl);
      const lowerTask = this.publishTaskMap.get(lowerTaskKey);
      if (lowerTask) {
        trt.lowerTask = lowerTask;
        lowerTask.higherTasks.push(trt);
      }

      if (prl === basePrl * 8) {
        basePrl = prl;
      }
      if (prl < prlFrom >> 1) {
        prl = prlFrom >> 1;
      }
    }
  }

  async buildTaskHierarchy() {
    const tls = await TimeLevel.find({ order: { intervalSeconds: 'ASC' } });
    for (const tl of tls) {
      this.timeLevelMap.set(tl.interval, tl);
    }

    const tlDirectLowerMap = new Map<string, string>();

    for (let ti = tls.length - 1; ti >= 0; ti--) {
      const t = tls[ti];
      for (let si = ti - 1; si >= 0; si--) {
        const s = tls[si];
        if (t.intervalSeconds % s.intervalSeconds === 0) {
          tlDirectLowerMap.set(t.interval, s.interval);
          break;
        }
      }
    }

    this.publishTasks = [];
    for (const timeLevel of tls) {
      const { interval, rollupFromInterval, intervalSeconds } = timeLevel;
      if (intervalSeconds > this.intervalSecondsTo) {
        continue;
      }
      const directLowerInterval = tlDirectLowerMap.get(interval);
      const lowerInterval = directLowerInterval || rollupFromInterval;
      const lowerTimeLevel = this.timeLevelMap.get(lowerInterval);
      const taskKey = this.genTaskKey(interval);
      const dataTable = this.marketDataService.getKLineDatasource(interval);
      const trt: PublishTask = {
        ...newPublishTask(),
        taskKey,
        dummy: intervalSeconds < this.intervalSecondsFrom,
        timeLevel,
        lowerTimeLevel,
        dataTable,
      };
      this.publishTaskMap.set(taskKey, trt);
      this.publishTasks.push(trt);

      if (lowerTimeLevel) {
        const lowerTaskKey = this.genTaskKey(lowerInterval);
        const lowerTask = this.publishTaskMap.get(lowerTaskKey);
        if (lowerTask) {
          trt.lowerTask = lowerTask;
          lowerTask.higherTasks.push(trt);
        }
      }

      this.buildFpTaskHierarchy(tlDirectLowerMap, timeLevel);
    }
  }

  traverseTasks(cb: (task: PublishTask, level: number) => void) {
    const visited = {};

    function walkTask(task: PublishTask, level = 0) {
      if (visited[task.taskKey]) {
        return;
      }
      cb(task, level);
      visited[task.taskKey] = true;
      if (task.higherTasks) {
        for (const ht of task.higherTasks) {
          walkTask(ht, level + 1);
        }
      }
    }

    for (const task of this.publishTasks) {
      walkTask(task);
    }
  }

  collectTaskTree(): string {
    const treeLines = [];
    this.traverseTasks((task, level) =>
      treeLines.push(`${'\t'.repeat(level)}${task.taskKey}`),
    );
    return treeLines.join('\n');
  }

  async onModuleInit() {
    await this.buildTaskHierarchy();
  }

  async start(profile: TaskScope) {
    this.logger.log(`:::: start ...`);

    const treeText = this.collectTaskTree();
    this.logger.debug('tasks:\n' + treeText);

    // profile ...

    for (const trt of this.publishTasks) {
      const { taskKey, timeLevel, trigger, higherTasks } = trt;
      const { interval, intervalSeconds } = timeLevel;
      const intervalMs = intervalSeconds * 1000;
      trigger.subscribe(async (event) => {
        // this.logger.debug(`Publish check, ${event}`, taskKey);

        const startTs = Date.now();
        // trt.lastCheckTs = startTs;
        // trt.checkCount++;
        if (trt.running) {
          this.logger.debug(`running`, taskKey);
          return;
        }

        const klEndTs = startTs - (startTs % intervalMs);
        const toKlineTs = klEndTs - intervalMs;

        if (trt.uptoKlTs && trt.uptoKlTs >= toKlineTs) {
          this.logger.debug(`up to date`, taskKey);
          return;
        }

        if (!trt.dummy) {
          const diff = startTs - klEndTs;
          const fpWait = 200;
          if (intervalSeconds < 5) {
            if (diff < fpWait) {
              this.logger.debug(`to wait, 1`, taskKey);
              return;
            }
          } else if (intervalSeconds <= 15) {
            if (diff < 500 + fpWait) {
              this.logger.debug(`to wait, 2`, taskKey);
              return;
            }
          } else if (intervalSeconds <= 60) {
            if (diff < 1000 + fpWait) {
              this.logger.debug(`to wait, 3`, taskKey);
              return;
            }
          } else if (intervalSeconds <= 60 * 60) {
            if (diff < 1500 + fpWait) {
              this.logger.debug(`to wait, 4`, taskKey);
              return;
            }
          } else {
            if (diff < 2000 + fpWait) {
              this.logger.debug(`to wait, 5`, taskKey);
              return;
            }
          }

          if (trt.prl === 1) {
            const klTask = this.publishTaskMap.get(this.genTaskKey(interval));
            if (klTask) {
              const maxWaitCount = 20;
              let waitCount = 0;
              while (waitCount < maxWaitCount) {
                if (klTask.uptoKlTs && klTask.uptoKlTs >= toKlineTs) {
                  break;
                }
                await wait(200);
                waitCount++;
              }
              if (waitCount === maxWaitCount) {
                this.logger.debug(`wait kline, failed`, taskKey);
                return;
              }
            }
          }
        }

        const execution: TaskExecution = {
          triggerSrc: event,
          startTs,
          lastKlineTs: trt.uptoKlTs,
          toKlineTs,
        };
        trt.execution = execution;
        trt.running = true;

        let tryCount = 0;
        while (tryCount < 3) {
          tryCount++;
          try {
            await this.selectAndPublish(trt);
          } catch (e) {
            this.logger.error(e, taskKey);
            execution.success = false;
          }
          if (execution.success) {
            break;
          }
          await wait(intervalSeconds <= 60 ? 1000 : 2000);
        }

        trt.running = false;
        if (execution.success) {
          if (higherTasks && higherTasks.length > 0) {
            // this.logger.debug(
            //   `trigger: ${higherTasks.map((ht) => ht.taskKey).join(',')}`,
            //   taskKey,
            // );
            for (const ht of higherTasks) {
              ht.trigger.next('lower');
            }
          }
        }
      });
    }

    // const tasks = [this.genTaskKey('1s'), this.genTaskKey('1s', 1)]
    //   .map((k) => this.publishTaskMap.get(k))
    //   .filter((t) => t);
    const tasks = this.publishTasks.filter(
      (t) => !t.lowerTask && t.timeLevel.interval === '1s',
    );
    setInterval(
      () => {
        tasks.forEach((t) => {
          t.trigger.next('timer');
        });
      },
      this.intervalSecondsFrom === 1 ? 500 : 1000,
    );
  }

  async selectAndPublish(task: PublishTask) {
    const { execution, timeLevel, taskKey, dummy, prl } = task;
    if (!execution) {
      return;
    }
    if (dummy) {
      execution.finishedTs = Date.now();
      execution.success = true;
      execution.klinesCount = 0;
      task.uptoKlTs = execution.toKlineTs;
      return;
    }

    if (prl) {
      let klines: Kline[] | undefined;
      const klTask = this.publishTaskMap.get(
        this.genTaskKey(timeLevel.interval),
      );
      if (klTask) {
        if (klTask.uptoKlTs == execution.toKlineTs && klTask.klines) {
          klines = klTask.klines;
        }
      }

      const fpKlines = await this.marketDataService.queryFpKLine({
        tsFrom: execution.toKlineTs,
        symbols: [],
        zipSymbols: false,
        timeInterval: timeLevel.interval,
        prl,
        klines,
      });
      if (fpKlines.length > 0) {
        execution.klinesCount = fpKlines.length;

        const producer =
          await this.channelService.getFpKlineProducer('publish-footprint');
        for (const kl of fpKlines) {
          const topic = this.channelService.getFpKlineTopic(
            kl.base,
            timeLevel.interval,
            prl,
          );
          const rtFpKline = MarketDataService.fpKlineToRtFpKline(kl);
          await producer.produce(topic, rtFpKline);
        }
        this.logger.debug(`published ${fpKlines.length} fp-klines`, taskKey);
      }
    } else {
      const klines = await this.marketDataService.queryKLines({
        tsFrom: execution.toKlineTs,
        symbols: [],
        zipSymbols: false,
        timeInterval: timeLevel.interval,
      });
      if (klines.length > 0) {
        execution.klinesCount = klines.length;
        task.klines = klines;

        const producer =
          await this.channelService.getKlineProducer('publish-kline');
        for (const kl of klines) {
          const topic = this.channelService.getKlineTopic(
            kl.base,
            timeLevel.interval,
          );
          const rtKline = MarketDataService.klineToRtKline(kl);
          await producer.produce(topic, rtKline);
        }
        this.logger.debug(`published ${klines.length} klines`, taskKey);
      }
    }

    if (execution.klinesCount && execution.klinesCount > 0) {
      task.uptoKlTs = execution.toKlineTs;
      task.accumulatedKlines += execution.klinesCount;
      execution.success = true;
    } else {
      execution.success = false;
    }

    execution.finishedTs = Date.now();
  }
}
