import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FeaturesModule } from './features/features.module';
import { SimilarityModule } from './similarity/similarity.module';
import { LogsModule } from './logs/logs.module';
import { ClusteringModule } from './clustering/clustering.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI_DOCKER', {
          infer: true,
        }),
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    UsersModule,
    FeaturesModule,
    SimilarityModule,
    LogsModule,
    ClusteringModule,
  ],
})
export class AppModule {}
