import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './users.schema';
import * as bcrypt from 'bcrypt';
import { parseCounty } from './county';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  /**
   * Validates + canonicalises homeCounty in-place.
   * - undefined => untouched
   * - null / '' => cleared (set to undefined)
   * - otherwise => must match allowed counties via parseCounty()
   */
  private normaliseHomeCounty<T extends { homeCounty?: unknown }>(obj: T): T {
    if (!('homeCounty' in obj)) return obj;

    const value = obj.homeCounty;

    // Allow "clear"
    if (value === null || value === '') {
      // delete so mongoose $set doesn't store null/empty string
      delete (obj as any).homeCounty;
      return obj;
    }

    // Validate + canonicalise if provided
    if (value !== undefined) {
      const parsed = parseCounty(value);
      if (!parsed) {
        throw new BadRequestException(`Invalid homeCounty: ${String(value)}`);
      }
      (obj as any).homeCounty = parsed;
    }

    return obj;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    this.normaliseHomeCounty(updates);
    return this.userModel.findByIdAndUpdate(id, updates, { new: true }).exec();
  }

  async updateUserByEmail(
    email: string,
    updates: Partial<User>,
  ): Promise<User | null> {
    const lowerEmail = email.toLowerCase();
    const existingUser = await this.userModel
      .findOne({ email: lowerEmail })
      .exec();
    if (!existingUser) return null;

    this.normaliseHomeCounty(updates);
    if (
      'homeCounty' in updates &&
      updates.homeCounty === existingUser.homeCounty
    ) {
      const { homeCounty, ...rest } = updates as any;
      updates = rest;
    }

    if (Object.keys(updates).length === 0) {
      return this.userModel.findOne({ email: lowerEmail }).exec();
    }

    return this.userModel
      .findOneAndUpdate({ email: lowerEmail }, updates, { new: true })
      .exec();
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async deleteUserByEmail(email: string): Promise<boolean> {
    const result = await this.userModel
      .deleteOne({ email: email.toLowerCase() })
      .exec();
    return result.deletedCount > 0;
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    homeCounty?: string;
    role?: string;
    passwordHash: string;
  }): Promise<User> {
    this.normaliseHomeCounty(data);

    const user = new this.userModel({
      ...data,
      email: data.email.toLowerCase(),
    });

    return user.save();
  }

  async findAll(): Promise<Omit<User, 'passwordHash' | '__v' | '_id'>[]> {
    const users = await this.userModel.find().lean();
    return users.map(({ passwordHash, __v, _id, ...rest }) => rest) as Omit<
      User,
      'passwordHash' | '__v' | '_id'
    >[];
  }

  async findMe(
    userId: string,
  ): Promise<Omit<User, 'passwordHash' | '__v' | '_id'> | null> {
    const user = await this.userModel.findById(userId).lean();
    if (!user) return null;

    const { passwordHash, __v, _id, ...rest } = user;
    return rest as Omit<User, 'passwordHash' | '__v' | '_id'>;
  }
}
