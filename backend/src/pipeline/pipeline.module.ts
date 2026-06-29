import { Module } from '@nestjs/common';
import { PipelineController } from './pipeline.controller';

@Module({ controllers: [PipelineController] })
export class PipelineModule {}
