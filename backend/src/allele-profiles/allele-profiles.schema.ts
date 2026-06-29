import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'allele_profiles' })
export class AlleleProfile extends Document {
  @Prop({ type: String, required: true, index: true })
  sample_id: string;

  @Prop({ type: String, required: true, index: true })
  analysis_profile: string;

  @Prop({ type: Object, default: {} })
  alleles: Record<string, string>;

  @Prop({ type: String })
  filename?: string;

  @Prop({ type: String })
  source?: string;

  @Prop({ default: Date.now })
  imported_at: Date;

  @Prop()
  updated_at?: Date;
}

export const AlleleProfileSchema = SchemaFactory.createForClass(AlleleProfile);

AlleleProfileSchema.index(
  { sample_id: 1, analysis_profile: 1 },
  { unique: true },
);
