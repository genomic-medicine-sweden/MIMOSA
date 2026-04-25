import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true }) firstName: string;
  @Prop({ required: true }) lastName: string;

  @Prop({
    required: false,
    unique: true,
    lowercase: true,
    sparse: true,
  })
  email: string;

  @Prop({
    required: false,
    unique: true,
    sparse: true,
  })
  username: string;

  @Prop({ required: false }) homeCounty: string;
  @Prop({ required: true }) passwordHash: string;

  @Prop({ enum: ['admin', 'user', 'automation'], default: 'user' })
  role: string;

  @Prop({
    type: {
      outbreakAlerts: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly'],
        default: 'daily',
      },
      counties: { type: [String], default: [] },
      alertThreshold: { type: Map, of: Number, default: {} },
    },
    default: {},
  })
  notificationPreferences: {
    outbreakAlerts: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    counties: string[];
    alertThreshold: Record<string, number>;
  };

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('findOneAndUpdate', function (next) {
  const update: any = this.getUpdate();
  if (update?.email) {
    update.email = update.email.toLowerCase();
  }
  if (update?.$set?.email) {
    update.$set.email = update.$set.email.toLowerCase();
  }
  next();
});
