import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PendingSample, PendingSampleSchema } from './pending-sample.schema';
import { PendingSamplesService } from './pending-samples.service';
import { PendingSamplesController } from './pending-samples.controller';
import { FeaturesModule } from '../features/features.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PendingSample.name, schema: PendingSampleSchema },
    ]),
    FeaturesModule,
  ],
  controllers: [PendingSamplesController],
  providers: [PendingSamplesService],
})
export class PendingSamplesModule {}
