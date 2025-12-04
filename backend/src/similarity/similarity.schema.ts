import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

class SimilarItem {
  @Prop() ID: string;
  @Prop() similarity: number;
}

@Schema()
export class Similarity extends Document {
  @Prop({ required: true }) ID: string;
  @Prop({ type: [SimilarItem], default: [] }) similar: SimilarItem[];
  @Prop({ default: Date.now }) createdAt: Date;
}

export const SimilaritySchema = SchemaFactory.createForClass(Similarity);
