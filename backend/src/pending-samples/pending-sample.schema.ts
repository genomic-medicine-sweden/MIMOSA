import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PendingSample extends Document {
  @Prop({ required: true, unique: true })
  expectedId: string;

  @Prop()
  postCode?: string;

  @Prop()
  hospital?: string;

  @Prop({ type: Object })
  manualCoordinates?: { lat: number; lng: number } | null;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const PendingSampleSchema = SchemaFactory.createForClass(PendingSample);
PendingSampleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
