import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from '../env';
import { AppLogger } from '@/common/app-logger';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
  ],
  providers: [AppLogger],
  exports: [AppLogger],
})
export class CommonModule {}
