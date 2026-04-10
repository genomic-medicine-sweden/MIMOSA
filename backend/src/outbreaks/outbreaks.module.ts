import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { ClusteringModule } from '../clustering/clustering.module';
import { FeaturesModule } from '../features/features.module';
import { Feature, FeatureSchema } from '../features/features.schema';
import { OutbreaksService } from './outbreaks.service';
import { OutbreaksController } from './outbreaks.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ClusteringModule,
    FeaturesModule,
    MongooseModule.forFeature([{ name: Feature.name, schema: FeatureSchema }]),
  ],
  providers: [OutbreaksService],
  controllers: [OutbreaksController],
  exports: [OutbreaksService],
})
export class OutbreaksModule {}
