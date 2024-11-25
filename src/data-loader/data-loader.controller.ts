import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ClassSerializerInterceptor as CSI } from '@nestjs/common/serializer/class-serializer.interceptor';
import {
  CreateBatchTaskParams,
  HistoryDataLoaderService,
} from '@/data-loader/history-data-loader.service';

@Controller('data-loader')
@UseInterceptors(CSI)
export class DataLoaderController {
  constructor(private dataLoaderService: HistoryDataLoaderService) {}

  @Post('create-tasks-for-each-day')
  createDailyTask(@Body() params: CreateBatchTaskParams): Promise<number> {
    return this.dataLoaderService.createTasksForEachDay(params);
  }

  @Post('create-tasks-for-each-month')
  createMonthlyTask(@Body() params: CreateBatchTaskParams): Promise<number> {
    return this.dataLoaderService.createTasksForEachMonth(params);
  }
}
