import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExcludedGroup } from './excluded-group.schema';
import { CreateExcludedGroupDto } from './dto/create-excluded-group.dto';

@Injectable()
export class ExcludedGroupsService {
  constructor(
    @InjectModel(ExcludedGroup.name)
    private readonly model: Model<ExcludedGroup>,
  ) {}

  findAll(): Promise<ExcludedGroup[]> {
    return this.model.find().sort({ added_at: -1 }).exec();
  }

  async create(
    dto: CreateExcludedGroupDto,
    addedBy: string,
  ): Promise<ExcludedGroup> {
    try {
      return await this.model.create({
        ...dto,
        added_by: addedBy,
        added_at: new Date(),
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException(
          `Group '${dto.group_id}' is already in the exclusion list.`,
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
