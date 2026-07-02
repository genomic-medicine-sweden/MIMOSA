import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExcludedSample } from './excluded-sample.schema';
import { CreateExcludedSampleDto } from './dto/create-excluded-sample.dto';

@Injectable()
export class ExcludedSamplesService {
  constructor(
    @InjectModel(ExcludedSample.name)
    private readonly model: Model<ExcludedSample>,
  ) {}

  findAll(): Promise<ExcludedSample[]> {
    return this.model.find().sort({ added_at: -1 }).exec();
  }

  async create(
    dto: CreateExcludedSampleDto,
    addedBy: string,
  ): Promise<ExcludedSample> {
    try {
      return await this.model.create({
        ...dto,
        added_by: addedBy,
        added_at: new Date(),
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException(
          `Sample '${dto.sample_id}' is already in the exclusion list.`,
        );
      }
      throw err;
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    await this.model.deleteMany({ _id: { $in: ids } }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}
