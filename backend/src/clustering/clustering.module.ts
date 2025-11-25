import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClusteringController } from './clustering.controller';
import { ClusteringService } from './clustering.service';
import { Clustering, ClusteringSchema } from './clustering.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Clustering.name, schema: ClusteringSchema },
    ]),
  ],
  controllers: [ClusteringController],
  providers: [ClusteringService],
})
export class ClusteringModule {}
