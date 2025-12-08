import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Distance } from './distance.schema';
import { DistanceDto } from './dto/distance.dto';

@Injectable()
export class DistanceService {
  constructor(
    @InjectModel(Distance.name)
    private distanceModel: Model<Distance>,
  ) {}

  async store(analysis_profile: string, dto: DistanceDto) {
    return this.distanceModel.findOneAndUpdate(
      { analysis_profile },
      { analysis_profile, ...dto },
      { upsert: true, new: true },
    );
  }

  async get(analysis_profile: string) {
    return this.distanceModel.findOne({ analysis_profile }).lean();
  }
}
