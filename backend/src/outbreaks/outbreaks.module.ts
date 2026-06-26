import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClusteringModule } from '../clustering/clustering.module';
import { FeaturesModule } from '../features/features.module';
import { Feature, FeatureSchema } from '../features/features.schema';
import {
  Notification,
  NotificationSchema,
} from '../notifications/notification.schema';
import { OutbreaksService } from './outbreaks.service';
import { OutbreaksController } from './outbreaks.controller';
import { MapConfigModule } from '../map-config/map-config.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ClusteringModule,
    FeaturesModule,
    MapConfigModule,
    MongooseModule.forFeature([
      { name: Feature.name, schema: FeatureSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [OutbreaksService],
  controllers: [OutbreaksController],
  exports: [OutbreaksService],
})
export class OutbreaksModule {}
