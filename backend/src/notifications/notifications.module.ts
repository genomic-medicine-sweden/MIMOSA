import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MailModule } from '../mail/mail.module';
import { ClusteringModule } from '../clustering/clustering.module';
import { FeaturesModule } from '../features/features.module';
import { Feature, FeatureSchema } from '../features/features.schema';

import { Notification, NotificationSchema } from './notification.schema';

import { User, UserSchema } from '../users/users.schema';

import { NotificationsService } from './notifications.service';
import { OutbreaksService } from './outbreaks.service';
import { OutbreaksController } from './outbreaks.controller';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    MailModule,
    ClusteringModule,
    FeaturesModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Feature.name, schema: FeatureSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [NotificationsService, OutbreaksService],
  controllers: [OutbreaksController, NotificationsController],
  exports: [NotificationsService, OutbreaksService],
})
export class NotificationsModule {}
