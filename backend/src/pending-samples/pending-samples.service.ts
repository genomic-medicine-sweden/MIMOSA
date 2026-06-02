import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ChangeStream } from 'mongodb';
import { PendingSample } from './pending-sample.schema';
import { CreatePendingSampleDto } from './dto/create-pending-sample.dto';
import { UpdatePendingSampleDto } from './dto/update-pending-sample.dto';
import { FeaturesService } from '../features/features.service';
import { pendingSamplesConfig } from '../config/pending-samples';

@Injectable()
export class PendingSamplesService implements OnModuleInit, OnModuleDestroy {
  private changeStream: ChangeStream | null = null;

  constructor(
    @InjectModel(PendingSample.name)
    private readonly pendingSampleModel: Model<PendingSample>,
    @InjectConnection() private readonly connection: Connection,
    private readonly featuresService: FeaturesService,
  ) {}

  onModuleInit() {
    this.watchForNewFeatures();
  }

  async onModuleDestroy() {
    await this.changeStream?.close();
  }

  private watchForNewFeatures() {
    const collection = this.connection.collection('features');
    this.changeStream = collection.watch([
      { $match: { operationType: 'insert' } },
    ]);

    this.changeStream.on('change', async (change: any) => {
      const id = change.fullDocument?.properties?.ID;
      if (id) await this.tryApplyPending(id);
    });

    this.changeStream.on('error', (err) => {
      console.error('[pending-samples] Change stream error:', err);
    });
  }

  private async tryApplyPending(featureId: string): Promise<void> {
    const pending = await this.pendingSampleModel
      .findOne({ expectedId: featureId })
      .exec();
    if (!pending) return;

    const props: Record<string, any> = {};
    if (pending.postCode != null) props.PostCode = pending.postCode;
    if (pending.hospital != null) props.Hospital = pending.hospital;
    if (pending.manualCoordinates != null)
      props.manualCoordinates = pending.manualCoordinates;

    if (Object.keys(props).length === 0) {
      await this.pendingSampleModel.findByIdAndDelete(pending._id).exec();
      return;
    }

    try {
      await this.featuresService.updateBySampleId(
        featureId,
        props,
        'system:pending-sample',
      );
      await this.pendingSampleModel.findByIdAndDelete(pending._id).exec();
      console.log(`[pending-samples] Applied metadata for ${featureId}`);
    } catch (err) {
      console.error(
        `[pending-samples] Failed to apply metadata for ${featureId}:`,
        err,
      );
    }
  }

  async findAll(): Promise<PendingSample[]> {
    return this.pendingSampleModel.find().sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreatePendingSampleDto): Promise<PendingSample> {
    const existing = await this.featuresService.findBySampleId(dto.expectedId);
    if (existing) {
      throw new BadRequestException(
        `Sample '${dto.expectedId}'has already been uploaded to MIMOSA. Update its metadata directly from the Samples page instead.`,
      );
    }

    const expiresInDays = pendingSamplesConfig.expiryDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    try {
      const doc = new this.pendingSampleModel({
        expectedId: dto.expectedId,
        postCode: dto.postCode,
        hospital: dto.hospital,
        manualCoordinates: dto.manualCoordinates,
        expiresAt,
      });
      return await doc.save();
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException(
          `A pending sample with ID '${dto.expectedId}' already exists.`,
        );
      }
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdatePendingSampleDto,
  ): Promise<PendingSample | null> {
    const existing = await this.featuresService.findBySampleId(dto.expectedId);
    if (existing) {
      throw new BadRequestException(
        `Sample '${dto.expectedId}' has already been uploaded to MIMOSA. Update its metadata directly from the Samples page instead.`,
      );
    }

    return this.pendingSampleModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            expectedId: dto.expectedId,
            postCode: dto.postCode ?? null,
            hospital: dto.hospital ?? null,
            manualCoordinates: dto.manualCoordinates ?? null,
          },
        },
        { new: true },
      )
      .exec();
  }

  async delete(id: string): Promise<void> {
    await this.pendingSampleModel.findByIdAndDelete(id).exec();
  }
}
