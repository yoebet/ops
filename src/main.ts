import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as process from 'process';
import { AppModule } from './app.module';
import { AppLogger } from './common/app-logger';
import { HttpConfig } from './common/config.types';
import { CatchAllFilter } from '@/common-web/filters/catch-all.filter';
import { Env } from '@/env';
import { AppServers } from '@/app-servers';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const configService = app.get(ConfigService);
  const logger = new AppLogger('main', configService);
  app.useLogger(logger);
  app.useGlobalFilters(new CatchAllFilter(logger));

  await app.init();

  const profileName = Env.serverProfile;
  const serverProfile = Env.predefinedProfiles[profileName];
  if (!serverProfile) {
    logger.error(`no server-profile: ${profileName}`);
    process.exit(-1);
  }

  app.enableShutdownHooks();

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
