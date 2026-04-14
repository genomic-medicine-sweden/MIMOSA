import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('notifications')
@Controller('api/notifications')
export class NotificationsController {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get notification history' })
  async getNotifications() {
    return this.notificationModel.find().sort({ sentAt: -1 }).limit(100);
  }
}
