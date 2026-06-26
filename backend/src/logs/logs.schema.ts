import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
class UpdateEntry {
  @Prop({ required: true }) date: Date;
  @Prop({ required: true }) changed_by: string;
  @Prop({ type: [String], required: true }) updated_fields: string[];
  @Prop({ type: MongooseSchema.Types.Mixed }) changes: Record<string, any>;
}

@Schema()
export class Log extends Document {
  // Per-sample log fields
  @Prop({ index: true }) sample_id?: string;
  @Prop() added_at?: Date;
  @Prop({ type: [UpdateEntry], default: [] }) updates: UpdateEntry[];

  // Shared
  @Prop({ required: true }) profile: string;

  // Batch audit event fields
  @Prop() event?: string;
  @Prop() deleted_count?: number;
  @Prop({ type: [String] }) deleted_ids?: string[];
  @Prop() triggered_by?: string;
}

export const LogSchema = SchemaFactory.createForClass(Log);
