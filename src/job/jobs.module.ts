import { Module, Provider } from '@nestjs/common';
import { SystemConfigModule } from '@/common-services/system-config.module';
import { JobsService } from '@/job/jobs.service';
import { JobsController } from '@/job/jobs.controller';

const services: Provider[] = [JobsService];

@Module({
  imports: [SystemConfigModule],
  providers: services,
  exports: services,
  controllers: [JobsController],
})
export class JobsModule {}
