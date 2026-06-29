import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FeaturesModule } from './features/features.module';
import { SimilarityModule } from './similarity/similarity.module';
import { LogsModule } from './logs/logs.module';
import { ClusteringModule } from './clustering/clustering.module';
import { DistanceModule } from './distance/distance.module';
import { MailModule } from './mail/mail.module';
import { OutbreaksModule } from './outbreaks/outbreaks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MapConfigModule } from './map-config/map-config.module';
import { PendingSamplesModule } from './pending-samples/pending-samples.module';
import { AlleleProfilesModule } from './allele-profiles/allele-profiles.module';
import { ChewbbacaModule } from './chewbbaca/chewbbaca.module';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI', { infer: true }),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    FeaturesModule,
    SimilarityModule,
    LogsModule,
    ClusteringModule,
    DistanceModule,
    MailModule,
    OutbreaksModule,
    NotificationsModule,
    MapConfigModule,
    PendingSamplesModule,
    AlleleProfilesModule,
    ChewbbacaModule,
    PipelineModule,
  ],
})
export class AppModule {}
