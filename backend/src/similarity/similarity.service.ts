import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Similarity } from './similarity.schema';

@Injectable()
export class SimilarityService {
  constructor(@InjectModel(Similarity.name) private model: Model<Similarity>) {}

  async findAll(): Promise<Similarity[]> {
    return this.model.find().exec();
  }
}
