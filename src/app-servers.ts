import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ServerProfile, ServerRole } from '@/common/server-profile.type';
import { AppLogger } from '@/common/app-logger';
import * as gitRepoInfo from 'git-repo-info';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import { InstanceLog } from '@/db/models/instance-log';
import { JobsService } from '@/job/jobs.service';
import { StrategyService } from '@/trade-strategy/strategy.service';
import { BacktestService } from '@/trade-strategy/backtest/backtest.service';
import { HistoryDataLoaderService } from '@/data-loader/history-data-loader.service';

@Injectable()
export class AppServers implements OnModuleInit, OnModuleDestroy {
  readonly startupTs = Date.now();
  private gitInfo: gitRepoInfo.GitRepoInfo;

  private sil: InstanceLog;

  constructor(
    protected configService: ConfigService<Config>,
    protected jobsService: JobsService,
    protected strategyService: StrategyService,
    protected backtestService: BacktestService,
    protected historyDataLoaderService: HistoryDataLoaderService,
    private logger: AppLogger,
  ) {
    logger.setContext('app-servers');
  }

  onModuleInit(): any {
    // const nodeId = this.configService.get<string>('serverNodeId');
    // this.sil = new InstanceLog();
    // this.sil.nodeId = nodeId;
    // this.sil.startedAt = new Date(this.startupTs);
    // const gi = this.getGitInfo();
    // this.sil.gitBranch = gi.branch;
    // this.sil.gitSha = gi.abbreviatedSha;
    // this.sil.gitCommitAt = gi.committerDate;
  }

  async onModuleDestroy() {
    // this.sil.stoppedAt = new Date();
    // this.sil.stopStyle = 'n';
    // await InstanceLog.save(this.sil).catch((e) => this.logger.error(e));
  }

  getGitInfo() {
    if (!this.gitInfo) {
      this.gitInfo = gitRepoInfo();
    }
    return this.gitInfo;
  }

  bootstrap(serverProfile: ServerProfile, profileName?: string) {
    const onErr = (e) => this.logger.error(e);

    this.logger.log(serverProfile);

    // this.sil.profileName = profileName;
    // this.sil.profile = serverProfile;
    // InstanceLog.save(this.sil).catch(onErr);

    if (
      serverProfile.Worker ||
      serverProfile.StrategyWorker ||
      serverProfile.BacktestWorker ||
      serverProfile.ExDataLoaderWorker
    ) {
      if (serverProfile.StrategyWorker) {
        this.strategyService.start();
      }
      if (serverProfile.BacktestWorker) {
        this.backtestService.start();
      }
      if (serverProfile.ExDataLoaderWorker) {
        this.historyDataLoaderService.start();
      }
      this.jobsService.startWorker().catch(onErr);
    }
  }
}
