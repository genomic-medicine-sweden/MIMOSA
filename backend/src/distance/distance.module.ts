import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Distance, DistanceSchema } from './distance.schema';
import { DistanceService } from './distance.service';
import { DistanceController } from './distance.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Distance.name, schema: DistanceSchema },
    ]),
  ],
  controllers: [DistanceController],
  providers: [DistanceService],
})
export class DistanceModule {}
