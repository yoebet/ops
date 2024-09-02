import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ServerProfile, ServerRole } from '@/common/server-profile.type';
import { TickerProducerService } from '@/data-ticker/ticker-producer.service';
import { AppLogger } from '@/common/app-logger';
import { DataPublishService } from '@/data-publish/data-publish.service';
import * as gitRepoInfo from 'git-repo-info';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';
import { ServerInstanceLog } from '@/db/models/server-instance-log';
import { TickerPatcherService } from '@/data-ticker/ticker-patcher.service';

@Injectable()
export class AppServers implements OnModuleInit, OnModuleDestroy {
  readonly startupTs = Date.now();
  private gitInfo: gitRepoInfo.GitRepoInfo;

  private sil: ServerInstanceLog;

  constructor(
    protected configService: ConfigService<Config>,
    protected tickerProducerService: TickerProducerService,
    protected tickerPatcherService: TickerPatcherService,
    protected dataPublishService: DataPublishService,
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
    ServerInstanceLog.save(this.sil).catch((e) => this.logger.error(e));

    const {
      [ServerRole.TickerProducer]: tickerProducerProfile,
      [ServerRole.DataPublisher]: dataPublisherProfile,
      [ServerRole.OflowServer]: OflowServerProfile,
    } = serverProfile;
    if (tickerProducerProfile) {
      this.tickerProducerService.start(tickerProducerProfile).catch(onErr);
      this.tickerPatcherService.startTaskScheduler().catch(onErr);
    }
    if (dataPublisherProfile) {
      this.dataPublishService.start(dataPublisherProfile).catch(onErr);
    }
  }
}
