import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'distance' })
export class Distance extends Document {
  @Prop({ required: true, unique: true })
  analysis_profile: string;

  @Prop({ type: [String], required: true })
  samples: string[];

  @Prop({ type: [[Number]], required: true })
  matrix: number[][];

  @Prop({ type: String, required: true })
  newick: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const DistanceSchema = SchemaFactory.createForClass(Distance);
