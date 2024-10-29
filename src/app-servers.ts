import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ServerProfile, ServerRole } from '@/common/server-profile.type';
import { ExWsService } from '@/data-ex-ws/ex-ws.service';
import { AppLogger } from '@/common/app-logger';
import * as gitRepoInfo from 'git-repo-info';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import { ServerInstanceLog } from '@/db/models/server-instance-log';
import { JobsService } from '@/job/jobs.service';

@Injectable()
export class AppServers implements OnModuleInit, OnModuleDestroy {
  readonly startupTs = Date.now();
  private gitInfo: gitRepoInfo.GitRepoInfo;

  private sil: ServerInstanceLog;

  constructor(
    protected configService: ConfigService<Config>,
    protected tickerProducerService: ExWsService,
    protected jobsService: JobsService,
    private logger: AppLogger,
  ) {
    logger.setContext('app-servers');
  }

  onModuleInit(): any {
    const nodeId = this.configService.get<string>('serverNodeId');
    this.sil = new ServerInstanceLog();
    this.sil.nodeId = nodeId;
    this.sil.startedAt = new Date(this.startupTs);
    const gi = this.getGitInfo();
    this.sil.gitBranch = gi.branch;
    this.sil.gitSha = gi.abbreviatedSha;
    this.sil.gitCommitAt = gi.committerDate;
  }

  async onModuleDestroy() {
    this.sil.stoppedAt = new Date();
    this.sil.stopStyle = 'n';
    await ServerInstanceLog.save(this.sil).catch((e) => this.logger.error(e));
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

    this.sil.profileName = profileName;
    this.sil.profile = serverProfile;
    ServerInstanceLog.save(this.sil).catch(onErr);

    const {
      [ServerRole.Exws]: tickerProducerProfile,
      [ServerRole.Worker]: workerProfile,
      [ServerRole.DataServer]: _dataServerProfile,
    } = serverProfile;
    if (tickerProducerProfile) {
      this.tickerProducerService.start(tickerProducerProfile).catch(onErr);
    }
    if (workerProfile) {
      this.jobsService.startWorker(workerProfile).catch(onErr);
    }
  }
}
