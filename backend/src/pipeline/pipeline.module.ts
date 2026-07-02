import { Module } from '@nestjs/common';
import { PipelineController } from './pipeline.controller';
import { LogsModule } from '../logs/logs.module';

@Module({ imports: [LogsModule], controllers: [PipelineController] })
export class PipelineModule {}
