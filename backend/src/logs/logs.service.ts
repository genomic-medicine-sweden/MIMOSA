import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log } from './logs.schema';

@Injectable()
export class LogsService {
  constructor(@InjectModel(Log.name) private model: Model<Log>) {}

  async findAll(): Promise<Log[]> {
    return this.model.find().sort({ added_at: 1 }).exec();
  }

  async findBySampleId(sampleId: string): Promise<Log | null> {
    return this.model.findOne({ sample_id: sampleId }).exec();
  }

  async logSampleUpdate(
    sampleId: string,
    changedBy: string,
    updatedFields: string[],
    changes: Record<string, any>,
  ): Promise<void> {
    const log = await this.model.findOne({ sample_id: sampleId });

    const updateEntry = {
      date: new Date(),
      changed_by: changedBy,
      updated_fields: updatedFields,
      changes,
    };

    if (log) {
      log.updates.push(updateEntry);
      await log.save();
    } else {
      const newLog = new this.model({
        sample_id: sampleId,
        added_at: new Date(),
        updates: [updateEntry],
      });
      await newLog.save();
    }
  }
}
