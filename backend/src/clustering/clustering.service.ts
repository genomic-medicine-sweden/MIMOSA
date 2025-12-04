import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Clustering } from './clustering.schema';
import { Model } from 'mongoose';

@Injectable()
export class ClusteringService {
  constructor(@InjectModel(Clustering.name) private model: Model<Clustering>) {}

  async findAll(): Promise<Clustering[]> {
    return this.model.find().sort({ createdAt: 1 }).exec();
  }
}
