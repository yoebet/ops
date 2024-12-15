import { BootstrapConsole } from 'nestjs-console';
import { UserModule } from './user-module';

const bootstrap = new BootstrapConsole({
  module: UserModule,
  useDecorators: true,
});
bootstrap.init().then(async (app) => {
  try {
    await app.init();
    await bootstrap.boot();
    await app.close();
  } catch (e) {
    console.error(e);
    await app.close();
    process.exit(1);
  }
});

// dev:
// ts-node -r tsconfig-paths/register src/user/console.ts user get wu

// prod:
// node dist/user/console.js  user get wu
