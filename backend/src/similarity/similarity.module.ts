import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SimilarityController } from './similarity.controller';
import { SimilarityService } from './similarity.service';
import { Similarity, SimilaritySchema } from './similarity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Similarity.name, schema: SimilaritySchema },
    ]),
  ],
  controllers: [SimilarityController],
  providers: [SimilarityService],
})
export class SimilarityModule {}
