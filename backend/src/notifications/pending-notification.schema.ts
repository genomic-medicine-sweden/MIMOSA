import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class PendingNotification extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  clusterId: string;

  @Prop({ required: true })
  total: number;

  @Prop({ type: [String], required: true })
  counties: string[];

  @Prop({ required: true })
  analysis_profile: string;

  @Prop()
  summary: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PendingNotificationSchema =
  SchemaFactory.createForClass(PendingNotification);

PendingNotificationSchema.index({ userId: 1, clusterId: 1 }, { unique: true });
