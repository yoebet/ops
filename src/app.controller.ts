import { Controller, Get } from '@nestjs/common';
import * as humanizeDuration from 'humanize-duration';
import { AppServers } from '@/app-servers';
import { ConfigService } from '@nestjs/config';
import { Config } from '@/common/config.types';

@Controller()
export class AppController {
  constructor(
    private configService: ConfigService<Config>,
    private appServers: AppServers,
  ) {}

  @Get()
  index(): string {
    return 'ok';
  }

  @Get('status')
  status() {
    const zhDuration = humanizeDuration.humanizer({
      delimiter: ' ',
      spacer: ' ',
    });
    const uptimeMs = Date.now() - this.appServers.startupTs;
    const uptime = zhDuration(uptimeMs, { round: true });
    const nodeId = this.configService.get<string>('serverNodeId');
    const gi = this.appServers.getGitInfo();
    return {
      uptime,
      branch: gi.branch,
      sha: gi.abbreviatedSha,
      commit: gi.committerDate,
      node: nodeId,
    };
  }
}
