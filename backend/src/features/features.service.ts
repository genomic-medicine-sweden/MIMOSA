import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import isEqual from 'lodash.isequal';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Feature } from './features.schema';
import { AlleleProfile } from '../allele-profiles/allele-profiles.schema';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectModel(Feature.name) private featureModel: Model<Feature>,
    @InjectModel(AlleleProfile.name)
    private alleleProfileModel: Model<AlleleProfile>,
    private readonly logsService: LogsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(): Promise<Feature[]> {
    return this.featureModel.find().exec();
  }

  async findBySampleId(sampleId: string): Promise<Feature | null> {
    return this.featureModel.findOne({ 'properties.ID': sampleId }).exec();
  }

  async findByIds(ids: string[]): Promise<Feature[]> {
    return this.featureModel.find({ 'properties.ID': { $in: ids } }).exec();
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
    const allowedFields = ['PostCode', 'Hospital', 'Date', 'manualCoordinates'];
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
      existing.properties?.analysis_profile ?? 'unknown',
      changedBy,
      updatedFields,
      finalChanges,
    );
    this.eventEmitter.emit('features.changed', { operationType: 'update' });

    return updated;
  }

  async deleteBySampleId(sampleId: string, deletedBy: string): Promise<void> {
    const feature = await this.featureModel.findOne({
      'properties.ID': sampleId,
    });

    if (!feature) {
      throw new NotFoundException(`Sample '${sampleId}' not found`);
    }

    const profile = feature.properties?.analysis_profile ?? 'unknown';

    const alleleProfiles = await this.alleleProfileModel
      .find({ sample_id: sampleId, source: 'chewbbaca' }, { filename: 1 })
      .lean();
    const filenames = [
      ...new Set(alleleProfiles.map((p) => p.filename).filter(Boolean)),
    ];

    await this.featureModel.deleteOne({ 'properties.ID': sampleId });
    await this.alleleProfileModel.deleteMany({ sample_id: sampleId });

    if (filenames.length > 0) {
      await this.alleleProfileModel.db
        .collection('processed_files')
        .deleteMany({ filename: { $in: filenames }, profile });
    }

    await this.logsService.logSampleDeletion(sampleId, profile, deletedBy);
    this.eventEmitter.emit('features.changed', { operationType: 'delete' });
  }
}
