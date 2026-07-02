import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExcludedSample, ExcludedSampleSchema } from './excluded-sample.schema';
import { ExcludedSamplesService } from './excluded-samples.service';
import { ExcludedSamplesController } from './excluded-samples.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExcludedSample.name, schema: ExcludedSampleSchema },
    ]),
  ],
  controllers: [ExcludedSamplesController],
  providers: [ExcludedSamplesService],
})
export class ExcludedSamplesModule {}
