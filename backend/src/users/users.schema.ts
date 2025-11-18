import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true }) firstName: string;
  @Prop({ required: true }) lastName: string;
  @Prop({ required: true, unique: true, lowercase: true }) email: string;
  @Prop({ required: true }) homeCounty: string;
  @Prop({ required: true }) passwordHash: string;
  @Prop({ enum: ['admin', 'user'], default: 'user' }) role: string;
  @Prop({ default: Date.now }) createdAt: Date;
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
