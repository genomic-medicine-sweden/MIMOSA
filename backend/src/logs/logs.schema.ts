import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
class UpdateEntry {
  @Prop({ required: true }) date: Date;
  @Prop({ required: true }) changed_by: string;
  @Prop({ type: [String], required: true }) updated_fields: string[];
  @Prop({ type: MongooseSchema.Types.Mixed }) changes: Record<string, any>;
}

@Schema({ _id: false })
class ConflictEntry {
  @Prop({ required: true }) bonsai_id: string;
  @Prop({ required: true }) chewbbaca_id: string;
  @Prop() profile?: string;
  @Prop({ required: true }) action: string;
  @Prop() store_action?: string;
}

@Schema()
export class Log extends Document {
  @Prop({ index: true }) sample_id?: string;
  @Prop() added_at?: Date;
  @Prop({ type: [UpdateEntry], default: [] }) updates: UpdateEntry[];

  @Prop({ required: true }) profile: string;

  @Prop() event?: string;
  @Prop() triggered_by?: string;

  @Prop() deleted_count?: number;
  @Prop({ type: [String] }) deleted_ids?: string[];

  @Prop() conflict_count?: number;
  @Prop({ type: [ConflictEntry] }) conflicts?: ConflictEntry[];
}

export const LogSchema = SchemaFactory.createForClass(Log);
