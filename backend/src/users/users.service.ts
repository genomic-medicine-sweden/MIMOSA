import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './users.schema';
import * as bcrypt from 'bcrypt';
import { MapConfigService } from '../map-config/map-config.service';
import mapConfig from '../config/map-config';

@Injectable()
export class UsersService {
  private countyIndex: Map<string, string> | null = null;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly mapConfigService: MapConfigService,
  ) {}

  private getCountyIndex(): Map<string, string> {
    if (this.countyIndex) return this.countyIndex;
    const boundaries = this.mapConfigService.getBoundaries();
    const nameKey = mapConfig.regionNameKey;
    this.countyIndex = new Map<string, string>();
    for (const feature of boundaries?.features ?? []) {
      const name = feature.properties?.[nameKey];
      if (typeof name === 'string' && name.trim()) {
        const key = name.trim().replace(/\s+/g, ' ').toLowerCase();
        this.countyIndex.set(key, name.trim().replace(/\s+/g, ' '));
      }
    }
    return this.countyIndex;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    return (
      (await this.findByEmail(identifier)) ??
      (await this.findByUsername(identifier))
    );
  }

  private normaliseHomeCounty<T extends { homeCounty?: unknown }>(obj: T): T {
    if (!('homeCounty' in obj)) return obj;
    const value = obj.homeCounty;
    if (value === null || value === '') {
      delete (obj as any).homeCounty;
      return obj;
    }
    if (value !== undefined) {
      if (typeof value !== 'string') {
        throw new BadRequestException(`Invalid homeCounty: ${String(value)}`);
      }
      const key = value.trim().replace(/\s+/g, ' ').toLowerCase();
      const canonical = this.getCountyIndex().get(key);
      if (!canonical) {
        throw new BadRequestException(`Invalid homeCounty: ${String(value)}`);
      }
      (obj as any).homeCounty = canonical;
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

    const mongoUpdate: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'notificationPreferences' && typeof value === 'object') {
        for (const [prefKey, prefValue] of Object.entries(value)) {
          mongoUpdate[`notificationPreferences.${prefKey}`] = prefValue;
        }
      } else {
        mongoUpdate[key] = value;
      }
    }

    if (Object.keys(mongoUpdate).length === 0) {
      return this.userModel.findOne({ email: lowerEmail }).exec();
    }

    return this.userModel
      .findOneAndUpdate(
        { email: lowerEmail },
        { $set: mongoUpdate },
        { new: true },
      )
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

  async deleteByIdentifier(identifier: string): Promise<boolean> {
    const user =
      (await this.findByEmail(identifier)) ??
      (await this.findByUsername(identifier));
    if (!user) return false;
    const result = await this.userModel.deleteOne({ _id: user._id }).exec();
    return result.deletedCount > 0;
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email?: string;
    username?: string;
    homeCounty?: string;
    outbreakAlerts?: boolean;
    role?: string;
    passwordHash: string;
  }): Promise<User> {
    const role = data.role ?? 'user';

    if (role !== 'automation' && !data.email) {
      throw new BadRequestException('Email is required.');
    }

    if (role === 'automation' && !data.email && !data.username) {
      throw new BadRequestException(
        'Automation accounts require at least an email or a username.',
      );
    }

    this.normaliseHomeCounty(data);

    const { outbreakAlerts, ...rest } = data;

    const user = new this.userModel({
      ...rest,
      role,
      email: data.email ? data.email.toLowerCase() : undefined,
      notificationPreferences: {
        outbreakAlerts: outbreakAlerts ?? false,
      },
    });
    return user.save();
  }

  async findUsersWithPipelineAlerts(): Promise<User[]> {
    return this.userModel
      .find({ 'notificationPreferences.pipelineFailureAlerts': true })
      .exec();
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
