import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import isEqual from 'lodash.isequal';
import { Feature } from './features.schema';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectModel(Feature.name) private featureModel: Model<Feature>,
    private readonly logsService: LogsService,
  ) {}

  async findAll(): Promise<Feature[]> {
    return this.featureModel.find().exec();
  }

  async findBySampleId(sampleId: string): Promise<Feature | null> {
    return this.featureModel.findOne({ 'properties.ID': sampleId }).exec();
  }

  async updateBySampleId(
    sampleId: string,
    updatedProps: Partial<Feature['properties']>,
    changedBy: string,
  ): Promise<Feature | null> {
    const existing = await this.featureModel.findOne({
      'properties.ID': sampleId,
    });

    if (!existing) {
      throw new NotFoundException(`Sample with ID '${sampleId}' not found`);
    }

    const originalProps = existing.properties || {};
    const allowedFields = ['PostCode', 'Hospital', 'Date'];

    const updatePayload: Record<string, any> = {};
    const updatedFields: string[] = [];
    const finalChanges: Record<string, { old: any; new: any }> = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(updatedProps, field) &&
        updatedProps[field] !== undefined
      ) {
        const oldVal = originalProps[field];
        const newVal = updatedProps[field];

        if (!isEqual(oldVal, newVal)) {
          updatePayload[`properties.${field}`] = newVal;
          updatedFields.push(field);
          finalChanges[field] = { old: oldVal, new: newVal };
        }
      }
    }

    if (updatedFields.length === 0) {
      return existing;
    }

    const updated = await this.featureModel
      .findOneAndUpdate(
        { 'properties.ID': sampleId },
        { $set: updatePayload },
        { new: true },
      )
      .exec();

    await this.logsService.logSampleUpdate(
      sampleId,
      changedBy,
      updatedFields,
      finalChanges,
    );

    return updated;
  }
}
