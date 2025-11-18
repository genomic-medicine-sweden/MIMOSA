import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'clustering' })
export class Clustering extends Document {
  @Prop({
    type: [
      {
        ID: { type: String, required: true },
        Cluster_ID: { type: String, required: true },
        Partition: { type: String, required: true },
      },
    ],
    default: [],
  })
  results: {
    ID: string;
    Cluster_ID: string;
    Partition: string;
  }[];

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ClusteringSchema = SchemaFactory.createForClass(Clustering);
