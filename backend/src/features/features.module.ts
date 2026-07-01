import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeaturesService } from './features.service';
import { FeaturesController } from './features.controller';
import { Feature, FeatureSchema } from './features.schema';
import {
  AlleleProfile,
  AlleleProfileSchema,
} from '../allele-profiles/allele-profiles.schema';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feature.name, schema: FeatureSchema },
      { name: AlleleProfile.name, schema: AlleleProfileSchema },
    ]),
    LogsModule,
  ],
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}
