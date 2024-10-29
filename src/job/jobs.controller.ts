import { JobsService } from '@/job/jobs.service';
import { Body, Controller, Delete, Put, Get, Param } from '@nestjs/common';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Put('board/queue')
  addQueue(@Body() params: { queue: string }): string {
    this.jobsService.bullBoardAddQueue(params.queue);
    return 'ok';
  }

  @Delete('board/queue')
  removeQueue(@Body() params: { queue: string }): string {
    this.jobsService.bullBoardRemoveQueue(params.queue);
    return 'ok';
  }
}
