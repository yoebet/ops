import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as process from 'process';
import { AppModule } from './app.module';
import { AppLogger } from './common/app-logger';
import { HttpConfig } from './common/config.types';
import { CatchAllFilter } from '@/common/filters/catch-all.filter';
import { Env } from '@/env';
import { AppServers } from '@/app-servers';
import { JobsService } from '@/job/jobs.service';
import { APP_BASE_PATH } from '@/common/constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(APP_BASE_PATH);
  app.enableCors();
  const configService = app.get(ConfigService);
  const logger = new AppLogger('main', configService);
  app.useLogger(logger);
  app.useGlobalFilters(new CatchAllFilter(logger));

  app.get(JobsService).app = app;
  await app.init();

  app.enableShutdownHooks();

  const profileName = Env.serverProfile;
  const serverProfile = Env.predefinedProfiles[profileName];
  if (!serverProfile) {
    logger.error(`no server-profile: ${profileName}`);
    process.exit(-1);
  }

  const servers = app.get(AppServers);
  servers.bootstrap(serverProfile, profileName);

  const httpConfig = configService.get<HttpConfig>('http');
  if (serverProfile.httpPort) {
    await app.listen(serverProfile.httpPort, httpConfig.host);
    const url = await app.getUrl();
    logger.log(`Server listening at: ${url}`);
  } else {
    logger.log(`Server started.`);
  }
}

bootstrap();
