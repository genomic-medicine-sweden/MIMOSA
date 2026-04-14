import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';

import { Notification } from './notification.schema';
import { User } from '../users/users.schema';
import { PendingNotification } from './pending-notification.schema';

import { MailService } from '../mail/mail.service';
import { OutbreakDetectedEvent } from '../outbreaks/outbreak-detected.event';
import outbreakRules from '../config/outbreak-rules.json';

import {
  buildAlertEmail,
  buildDailySummaryEmail,
  buildWeeklySummaryEmail,
  buildAlertText,
  buildDailySummaryText,
  buildWeeklySummaryText,
} from '../mail/templates/email-templates';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(PendingNotification.name)
    private readonly pendingNotificationModel: Model<PendingNotification>,

    private readonly mailService: MailService,
  ) {}

  @OnEvent('outbreaks.detected')
  async handleOutbreakDetected(event: OutbreakDetectedEvent) {
    const { analysis_profile, outbreaks } = event;

    await this.notificationModel.deleteMany({
      analysis_profile,
      clusterId: { $nin: outbreaks.map((o) => o.clusterId) },
    });

    const alreadySent = await this.notificationModel.find({
      clusterId: { $in: outbreaks.map((o) => o.clusterId) },
      analysis_profile,
    });

    const alreadySentIds = new Set(alreadySent.map((n) => n.clusterId));

    const newOutbreaks = outbreaks.filter(
      (o) => !alreadySentIds.has(o.clusterId),
    );

    if (!newOutbreaks.length) {
      console.log(
        `[Notifications] All clusters already notified for ${analysis_profile}, skipping`,
      );
      return;
    }

    const users = await this.userModel.find({
      'notificationPreferences.outbreakAlerts': true,
    });

    const profiles = outbreakRules.profiles as Record<
      string,
      { detectionThreshold: number }
    >;

    let totalSent = 0;

    for (const user of users) {
      const prefs = user.notificationPreferences || {};
      const frequency = prefs.frequency || 'immediate';
      const alertThresholds =
        (prefs.alertThreshold as unknown as Record<string, number>) ?? {};
      const counties = prefs.counties || [];

      const userOutbreaks = newOutbreaks.filter((o) => {
        const detectionThreshold =
          profiles[o.analysis_profile]?.detectionThreshold ??
          outbreakRules.default.detectionThreshold;

        const alertThreshold =
          alertThresholds[o.analysis_profile] ??
          alertThresholds['default'] ??
          detectionThreshold;

        if (o.total < alertThreshold) return false;
        if (counties.length > 0) {
          return o.counties.some((c) => counties.includes(c));
        }
        return true;
      });

      if (!userOutbreaks.length) continue;

      if (frequency === 'immediate') {
        const html = buildAlertEmail(userOutbreaks);
        const text = buildAlertText(userOutbreaks);

        await this.mailService.sendMail(
          [user.email],
          'MIMOSA Outbreak Alert',
          html,
          text,
        );

        totalSent++;
      } else {
        for (const o of userOutbreaks) {
          await this.pendingNotificationModel.findOneAndUpdate(
            { userId: user._id, clusterId: o.clusterId },
            {
              $set: {
                total: o.total,
                counties: o.counties,
                analysis_profile: o.analysis_profile,
                createdAt: new Date(),
              },
            },
            { upsert: true, new: true },
          );
        }
      }
    }

    await this.notificationModel.insertMany(
      newOutbreaks.map((o) => ({
        clusterId: o.clusterId,
        total: o.total,
        counties: o.counties,
        sampleIds: o.sampleIds,
        analysis_profile: o.analysis_profile,
        sentAt: new Date(),
      })),
    );

    console.log(
      `[Notifications] Sent ${totalSent} immediate alert(s) for ${analysis_profile}`,
    );
  }

  @Cron('0 8 * * *')
  async sendDailyNotifications() {
    const users = await this.userModel.find({
      'notificationPreferences.outbreakAlerts': true,
      'notificationPreferences.frequency': 'daily',
    });

    for (const user of users) {
      const pending = await this.pendingNotificationModel.find({
        userId: user._id,
      });
      if (!pending.length) continue;

      const html = buildDailySummaryEmail(pending);
      const text = buildDailySummaryText(pending);

      await this.mailService.sendMail(
        [user.email],
        'MIMOSA Daily Outbreak Summary',
        html,
        text,
      );

      await this.pendingNotificationModel.deleteMany({ userId: user._id });
    }

    console.log('[Notifications] Daily notifications sent');
  }

  @Cron('0 8 * * 1')
  async sendWeeklyNotifications() {
    const users = await this.userModel.find({
      'notificationPreferences.outbreakAlerts': true,
      'notificationPreferences.frequency': 'weekly',
    });

    for (const user of users) {
      const pending = await this.pendingNotificationModel.find({
        userId: user._id,
      });
      if (!pending.length) continue;

      const html = buildWeeklySummaryEmail(pending);
      const text = buildWeeklySummaryText(pending);

      await this.mailService.sendMail(
        [user.email],
        'MIMOSA Weekly Outbreak Summary',
        html,
        text,
      );

      await this.pendingNotificationModel.deleteMany({ userId: user._id });
    }

    console.log('[Notifications] Weekly notifications sent');
  }
}
