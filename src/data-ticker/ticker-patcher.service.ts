import { Injectable, OnModuleInit } from '@nestjs/common';
import { TickerProducerService } from '@/data-ticker/ticker-producer.service';
import { AppLogger } from '@/common/app-logger';
import { ExTradeTask } from '@/db/models/ex-trade-task';
import { ExchangeRestService } from '@/exchange/exchange-rest.service';
import { ExchangeSymbolEnabled } from '@/db/models/exchange-symbol-enabled';
import { TradeChannelEvent } from '@/exchange/ws-capacities';
import { DataTaskStatus, ExDataTask } from '@/db/models/ex-data-task';
import { ExTradeSymbolTask } from '@/db/models/ex-trade-symbol-task';
import { MarketDataService } from '@/data-service/market-data.service';
import { ExRest } from '@/exchange/base/rest/ex-rest';
import { SymbolService } from '@/common-services/symbol.service';
import { groupBy, toPairs } from 'lodash';
import { IsNull, MoreThan, Not } from 'typeorm';
import { wait } from '@/common/utils/utils';

@Injectable()
export class TickerPatcherService implements OnModuleInit {
  constructor(
    readonly symbolService: SymbolService,
    readonly marketDataService: MarketDataService,
    readonly tickerService: TickerProducerService,
    readonly exchangeRestService: ExchangeRestService,
    readonly logger: AppLogger,
  ) {
    logger.setContext('ticker-patcher');
  }

  async onModuleInit() {
    this.tickerService.tradeChannelEvent.subscribe(
      async (ce: TradeChannelEvent) => {
        const lastTrade = ce.lastMessage;
        const resumeTrade = ce.resumeMessage;

        let taskKey: string;
        if (ce.event === 'disconnect') {
          if (!lastTrade) {
            return;
          }
          taskKey = 'l/' + lastTrade.tradeId;
        } else {
          // open
          if (!resumeTrade) {
            return;
          }
          taskKey = 'r/' + resumeTrade.tradeId;
        }

        const ex = lastTrade?.ex || resumeTrade?.ex;
        const exAccount = lastTrade?.exAccount || resumeTrade?.exAccount;
        const rawSymbol = lastTrade?.rawSymbol || resumeTrade?.rawSymbol;
        if (!this.exchangeRestService.supportExAccount(exAccount)) {
          return;
        }

        const symbol = this.symbolService.getSymbol(exAccount, rawSymbol);
        if (!symbol) {
          return;
        }

        let task = await ExTradeTask.findOneBy({
          exAccount,
          key: taskKey,
        });
        if (!task) {
          task = new ExTradeTask();
          task.ex = ex;
          task.exAccount = exAccount;
          task.key = taskKey;
        }

        if (lastTrade) {
          task.lastTrade = {
            tradeId: lastTrade.tradeId,
            tradeTs: lastTrade.ts,
            symbol,
          };
        }
        if (resumeTrade) {
          task.resumeTrade = {
            tradeId: resumeTrade.tradeId,
            tradeTs: resumeTrade.ts,
            symbol,
          };
        }

        await ExTradeTask.save(task);

        if (resumeTrade) {
          this.patchTradeData(task).catch((e) => this.logger.error(e));
        }
      },
    );
  }

  async startTaskScheduler() {
    this.logger.log(`:::: start trade data patcher ...`);
    setTimeout(() => {
      setInterval(this.findAndRunPendingTasks.bind(this), 15 * 60 * 1000);
    }, 60 * 1000);
  }

  private async findAndRunPendingTasks() {
    this.logger.debug(`run tasks ...`);
    const pendingTasks = await ExTradeTask.findBy({
      status: DataTaskStatus.pending,
      resumeTrade: Not(IsNull()),
      createdAt: MoreThan(new Date(Date.now() - 12 * 60 * 60 * 1000)),
    });
    const groups = groupBy(pendingTasks, 'exAccount');
    const pairs = toPairs(groups);
    await Promise.all(
      pairs.map(async ([exAccount, tasks]) => {
        for (const task of tasks) {
          await this.patchTradeData(task).catch((e) => this.logger.error(e));
          await wait(100);
        }
      }),
    );
  }

  private async startTask(task: ExTradeTask) {
    if (task.status === DataTaskStatus.running) {
      return;
    }
    task.status = DataTaskStatus.running;
    task.startedAt = new Date();
    await ExTradeTask.save(task);
  }

  private async finishTask(
    task: ExTradeTask,
    status?: DataTaskStatus,
    errMsg?: string,
  ) {
    task.status = status || DataTaskStatus.completed;
    task.errMsg = errMsg;
    task.finishedAt = new Date();
    await ExTradeTask.save(task);
  }

  private async failTask(task: ExTradeTask, errMsg?: string) {
    await this.finishTask(task, DataTaskStatus.failed, errMsg);
  }

  private async startSymbolTask(task: ExTradeSymbolTask) {
    if (task.status === DataTaskStatus.running) {
      return;
    }
    task.status = DataTaskStatus.running;
    task.startedAt = new Date();
    await ExTradeSymbolTask.save(task);
  }

  private async finishSymbolTask(
    task: ExTradeSymbolTask,
    status?: DataTaskStatus,
    errMsg?: string,
  ) {
    task.status = status || DataTaskStatus.completed;
    task.errMsg = errMsg;
    task.finishedAt = new Date();
    await ExTradeSymbolTask.save(task);
  }

  private async failSymbolTask(task: ExTradeSymbolTask, errMsg?: string) {
    await this.finishSymbolTask(task, DataTaskStatus.failed, errMsg);
  }

  async patchTradeData(task: ExTradeTask) {
    if (ExDataTask.dataTaskFinished(task.status)) {
      return;
    }
    if (task.status === DataTaskStatus.running) {
      return;
    }

    await this.startTask(task);

    try {
      if (!task.resumeTrade) {
        await this.failTask(task, 'no resumeTrade');
        return;
      }

      const exRest = this.exchangeRestService.getExRest(task.exAccount);
      if (!exRest) {
        await this.failTask(task, 'no ex-rest service');
        return;
      }

      if (!task.symbols) {
        const symbols = await ExchangeSymbolEnabled.findBy({
          exAccount: task.exAccount,
        });
        task.symbols = symbols.map((s) => s.symbol);
        if (task.symbols.length === 0) {
          await this.finishTask(task);
          return;
        }
      }

      const symbolTasks = await ExTradeSymbolTask.findBy({
        tradeTaskId: task.id,
      });
      const existsTasks = new Map<string, ExTradeSymbolTask>(
        symbolTasks.map((st) => [st.symbol, st]),
      );

      let patchedCount = 0;

      for (const symbol of task.symbols) {
        let symbolTask = existsTasks.get(symbol);
        if (symbolTask) {
          if (ExDataTask.dataTaskFinished(symbolTask.status)) {
            patchedCount += symbolTask.patchedCount;
            continue;
          }
          if (symbolTask.status === DataTaskStatus.running) {
            continue;
          }
        } else {
          symbolTask = new ExTradeSymbolTask();
          symbolTask.tradeTaskId = task.id;
          symbolTask.ex = task.ex;
          symbolTask.exAccount = task.exAccount;
          symbolTask.symbol = symbol;

          const tradeWithinHours = 12;

          if (task.lastTrade) {
            const tlt = task.lastTrade;
            if (tlt.symbol === symbol) {
              symbolTask.lastTrade = {
                tradeId: tlt.tradeId,
                tradeTs: tlt.tradeTs,
              };
            } else {
              symbolTask.lastTrade =
                await this.marketDataService.findPreviousTrade({
                  ex: symbolTask.ex,
                  symbol: symbolTask.symbol,
                  tradeTs: tlt.tradeTs,
                  withinHours: tradeWithinHours,
                });
            }
          } else {
            symbolTask.lastTrade =
              await this.marketDataService.findPreviousTrade({
                ex: symbolTask.ex,
                symbol: symbolTask.symbol,
                tradeTs: task.resumeTrade.tradeTs,
                withinHours: tradeWithinHours,
              });
          }
          const trt = task.resumeTrade;
          if (trt.symbol === symbol) {
            symbolTask.resumeTrade = {
              tradeId: trt.tradeId,
              tradeTs: trt.tradeTs,
            };
          } else {
            symbolTask.resumeTrade = await this.marketDataService.findNextTrade(
              {
                ex: symbolTask.ex,
                symbol: symbolTask.symbol,
                tradeTs: trt.tradeTs,
                withinHours: tradeWithinHours,
              },
            );
          }
          if (!symbolTask.lastTrade) {
            await this.failSymbolTask(symbolTask, 'no lastTrade');
            return;
          }
          await ExTradeSymbolTask.save(symbolTask);
        }

        await this.patchTradeSymbolData(symbolTask, exRest).catch((e) => {
          this.logger.error(e);
          this.failSymbolTask(symbolTask, e?.message);
        });
        patchedCount += symbolTask.patchedCount;
      }

      task.patchedCount = patchedCount;
      await this.finishTask(task);
    } catch (e) {
      this.logger.error(e);
      await this.failTask(task, e?.message);
    }
  }

  private async patchTradeSymbolData(
    symbolTask: ExTradeSymbolTask,
    exRest: ExRest,
  ) {
    await this.startSymbolTask(symbolTask);

    try {
      const { lastTrade, resumeTrade, exAccount, symbol } = symbolTask;

      const rawSymbol = this.symbolService.getRawSymbol(exAccount, symbol);
      if (!rawSymbol) {
        await this.failSymbolTask(symbolTask, `no symbol`);
        return;
      }

      let { patchFromTrade, patchToTrade } = symbolTask;
      if (!patchFromTrade) {
        patchFromTrade = lastTrade;
      }
      if (!patchToTrade) {
        patchToTrade = resumeTrade;
      }

      if (!patchFromTrade) {
        await this.failSymbolTask(symbolTask, `no lastTrade`);
        return;
      }
      if (!patchToTrade) {
        await this.failSymbolTask(symbolTask, `no resumeTrade`);
        return;
      }

      if (patchFromTrade.tradeId && patchToTrade.tradeId) {
        const from = +patchFromTrade.tradeId;
        const to = +patchToTrade.tradeId;
        if (from && to && from + 1 >= to) {
          await this.finishSymbolTask(symbolTask);
          return;
        }
      }

      const exchangeSymbol = this.symbolService.getExchangeSymbol(
        exAccount,
        rawSymbol,
      );
      if (!exchangeSymbol || !exchangeSymbol.symbolConfig) {
        await this.failSymbolTask(symbolTask, `no exchangeSymbol`);
        return;
      }

      let fetchTimes = 0;

      while (fetchTimes < 100) {
        fetchTimes++;
        let exTrades = await exRest.getHistoryTrades({
          symbol: rawSymbol,
          fromId: patchFromTrade.tradeId,
          toId: patchToTrade.tradeId,
        });
        if (exTrades.length === 0) {
          break;
        }
        const firstTrade = exTrades[0];
        const lastTrade = exTrades[exTrades.length - 1];

        if (lastTrade.ts > patchToTrade.tradeTs) {
          exTrades = exTrades.filter((t) => t.ts <= patchToTrade.tradeTs);
          if (exTrades.length === 0) {
            break;
          }
        }

        const trades = exTrades
          .map((et) => {
            return TickerProducerService.buildTrade(et, exchangeSymbol);
          })
          .filter((t) => t);

        const saved = await this.marketDataService.saveTrades(trades);
        this.logger.debug(
          `[${exAccount}:${symbol}] saved: ${saved} (tid: ${symbolTask.tradeTaskId})`,
        );
        symbolTask.patchedCount += saved;
        symbolTask.fetchTimes++;

        let lastPatchFromTrade = patchFromTrade;
        let lastPatchToTrade = patchToTrade;
        if (
          firstTrade.ts - patchFromTrade.tradeTs >
          patchToTrade.tradeTs - lastTrade.ts
        ) {
          patchToTrade = {
            tradeId: firstTrade.tradeId,
            tradeTs: firstTrade.ts,
          };
          symbolTask.patchToTrade = patchToTrade;
        } else {
          patchFromTrade = {
            tradeId: lastTrade.tradeId,
            tradeTs: lastTrade.ts,
          };
          symbolTask.patchFromTrade = patchFromTrade;
        }

        await ExTradeSymbolTask.save(symbolTask);

        if (patchFromTrade.tradeTs >= patchToTrade.tradeTs) {
          break;
        }
        if (
          patchFromTrade.tradeTs <= lastPatchFromTrade.tradeTs &&
          patchToTrade.tradeTs >= lastPatchToTrade.tradeTs
        ) {
          break;
        }
      }

      await this.finishSymbolTask(symbolTask);
    } catch (err) {
      this.logger.error(err);
      await this.failSymbolTask(symbolTask);
    }
  }
}
