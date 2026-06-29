import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlleleProfile, AlleleProfileSchema } from './allele-profiles.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlleleProfile.name, schema: AlleleProfileSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class AlleleProfilesModule {}
