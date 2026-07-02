import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'excluded_samples' })
export class ExcludedSample extends Document {
  @Prop({ required: true }) sample_id: string;
  @Prop({ required: true }) profile: string;
  @Prop({ type: Date, default: Date.now }) added_at: Date;
  @Prop() added_by?: string;
}

export const ExcludedSampleSchema =
  SchemaFactory.createForClass(ExcludedSample);
ExcludedSampleSchema.index({ sample_id: 1, profile: 1 }, { unique: true });
