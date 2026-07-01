import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log } from './logs.schema';

@Injectable()
export class LogsService {
  constructor(@InjectModel(Log.name) private model: Model<Log>) {}

  async findAll(): Promise<Log[]> {
    return this.model.find().sort({ added_at: -1 }).limit(500).exec();
  }

  async findBySampleId(sampleId: string): Promise<Log | null> {
    return this.model.findOne({ sample_id: sampleId }).exec();
  }

  async logSampleUpdate(
    sampleId: string,
    profile: string,
    changedBy: string,
    updatedFields: string[],
    changes: Record<string, any>,
  ): Promise<void> {
    const updateEntry = {
      date: new Date(),
      changed_by: changedBy,
      updated_fields: updatedFields,
      changes,
    };

    const result = await this.model.updateOne(
      { sample_id: sampleId },
      {
        $push: { updates: updateEntry },
        $setOnInsert: { added_at: new Date(), profile },
      },
      { upsert: true },
    );

    if (result.matchedCount === 0 && result.upsertedCount === 0) {
      throw new Error(`Failed to log update for sample '${sampleId}'`);
    }
  }

  async logSampleDeletion(
    sampleId: string,
    profile: string,
    deletedBy: string,
  ): Promise<void> {
    await this.model.create({
      event: 'deletion',
      triggered_by: deletedBy,
      profile,
      added_at: new Date(),
      deleted_ids: [sampleId],
      deleted_count: 1,
    });
  }
}
