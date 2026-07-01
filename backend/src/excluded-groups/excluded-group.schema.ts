import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'excluded_groups' })
export class ExcludedGroup extends Document {
  @Prop({ required: true, unique: true }) group_id: string;
  @Prop({ type: Date, default: Date.now }) added_at: Date;
  @Prop() added_by?: string;
}

export const ExcludedGroupSchema = SchemaFactory.createForClass(ExcludedGroup);
