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

  @Prop({ type: [String], default: [] })
  hospitals: string[] = [];

  @Prop({ type: [String], default: [] })
  sampleIds: string[];

  @Prop({ required: false })
  analysis_profile?: string;

  @Prop({ default: Date.now })
  sentAt: Date;

  @Prop({ default: Date.now })
  lastGrowthAt: Date;

  @Prop({ required: false })
  lastTotal?: number;

  @Prop({ required: false })
  lastRefreshTotal?: number;

  @Prop({ required: false })
  lastNotifiedTotal?: number;

  @Prop({ type: [String], default: [] })
  lastNotifiedHospitals: string[] = [];

  @Prop({ type: [String], default: [] })
  lastNotifiedCounties: string[] = [];
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
