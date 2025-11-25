import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Feature extends Document {
  @Prop({ required: true }) type: string;

  @Prop({ type: Object }) properties: {
    PostCode?: string;
    Hospital?: string;
    analysis_profile?: string;
    Pipeline_Version?: string;
    Pipeline_Date?: string;
    Date?: string;
    ID?: string;
    QC_Status?: string;
    typing?: {
      ST?: string;
      alleles?: Record<string, string>;
    };
  };

  @Prop({ type: Object, required: true })
  geometry: {
    type: string;
    coordinates: number[];
  };
}

export const FeatureSchema = SchemaFactory.createForClass(Feature);
