import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'notifications' })
export class Notification extends Document {
  @Prop({ required: true, index: true })
  clusterId: string;

  @Prop({ required: true })
  total: number;

  @Prop({ type: [String], default: [] })
  counties: string[];

  @Prop({ required: false })
  analysis_profile?: string;

  @Prop({ default: Date.now })
  sentAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
