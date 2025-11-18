import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
class UpdateEntry {
  @Prop({ required: true }) date: Date;

  @Prop({ required: true }) changed_by: string;

  @Prop({ type: [String], required: true })
  updated_fields: string[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  changes: Record<string, any>;
}

@Schema()
export class Log extends Document {
  @Prop({ required: true, index: true })
  sample_id: string;

  @Prop({ required: true })
  added_at: Date;

  @Prop({ type: [UpdateEntry], default: [] })
  updates: UpdateEntry[];
}

export const LogSchema = SchemaFactory.createForClass(Log);
