import { Module, Provider } from '@nestjs/common';
import { CommonServicesModule } from '@/common-services/common-services.module';
import { JobsService } from '@/job/jobs.service';
import { JobsController } from '@/job/jobs.controller';

const services: Provider[] = [JobsService];

@Module({
  imports: [CommonServicesModule],
  providers: services,
  exports: services,
  controllers: [JobsController],
})
export class JobsModule {}
