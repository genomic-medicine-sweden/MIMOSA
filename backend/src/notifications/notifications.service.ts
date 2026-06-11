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
  buildAlertText,
  buildDailyDigestEmail,
  buildDailyDigestText,
  buildWeeklyDigestEmail,
  buildWeeklyDigestText,
  GrowthData,
  OutbreakData,
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

  private getAlertRules(analysis_profile: string): {
    detectionThreshold: number;
    alertMinGrowthForRefresh: number;
  } {
    const profiles = outbreakRules.profiles as Record<
      string,
      { detectionThreshold: number; alertMinGrowthForRefresh?: number }
    >;
    const profile = profiles[analysis_profile];
    return {
      detectionThreshold:
        profile?.detectionThreshold ?? outbreakRules.default.detectionThreshold,
      alertMinGrowthForRefresh:
        profile?.alertMinGrowthForRefresh ??
        outbreakRules.default.alertMinGrowthForRefresh,
    };
  }

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
    const alreadySentMap = new Map(alreadySent.map((n) => [n.clusterId, n]));

    const rules = this.getAlertRules(analysis_profile);
    const now = new Date();

    type GrowthCandidate = {
      existing: (typeof alreadySent)[0];
      outbreak: (typeof outbreaks)[0];
      lastNotifiedTotal: number;
      lastRefreshTotal: number;
      growth: number;
    };

    const growthCandidates: GrowthCandidate[] = [];
    for (const o of outbreaks) {
      const existing = alreadySentMap.get(o.clusterId);
      if (!existing) continue;
      const lastNotifiedTotal = existing.lastNotifiedTotal ?? existing.total;
      const lastRefreshTotal = existing.lastRefreshTotal ?? existing.total;
      growthCandidates.push({
        existing,
        outbreak: o,
        lastNotifiedTotal,
        lastRefreshTotal,
        growth: Math.max(0, o.total - lastNotifiedTotal),
      });
    }

    const newOutbreaks = outbreaks.filter(
      (o) => !alreadySentMap.has(o.clusterId),
    );

    const hasGrowth = growthCandidates.some((c) => c.growth > 0);
    if (!newOutbreaks.length && !hasGrowth) {
      console.log(
        `[Notifications] No new or growing clusters for ${analysis_profile}, skipping`,
      );
      await Promise.all(
        growthCandidates.map((c) =>
          this.notificationModel.updateOne(
            { _id: c.existing._id },
            { $set: { lastTotal: c.outbreak.total } },
          ),
        ),
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

    const clustersNotified = new Set<string>();
    let totalSent = 0;

    for (const user of users) {
      const prefs = user.notificationPreferences || {};
      const frequency = prefs.frequency || 'immediate';
      const alertThresholds =
        (prefs.alertThreshold as unknown as Record<string, number>) ?? {};
      const counties = prefs.counties || [];

      const userNewOutbreaks = newOutbreaks.filter((o) => {
        const detectionThreshold =
          profiles[o.analysis_profile]?.detectionThreshold ??
          outbreakRules.default.detectionThreshold;
        const alertThreshold =
          alertThresholds[o.analysis_profile] ??
          alertThresholds['default'] ??
          detectionThreshold;
        if (o.total < alertThreshold) return false;
        if (counties.length > 0)
          return o.counties.some((c) => counties.includes(c));
        return true;
      });

      const userGrowth: GrowthData[] = [];
      if (prefs.growthAlerts) {
        const gt = (prefs as any).growthThreshold ?? {
          type: 'absolute',
          value: 5,
        };
        for (const c of growthCandidates) {
          if (c.growth <= 0) continue;
          if (
            counties.length > 0 &&
            !c.outbreak.counties.some((co) => counties.includes(co))
          )
            continue;

          let triggered = false;
          if (gt.type === 'absolute') {
            triggered = c.growth >= gt.value;
          } else if (gt.type === 'total') {
            triggered =
              c.outbreak.total >= gt.value && c.lastNotifiedTotal < gt.value;
          } else if (gt.type === 'percent') {
            triggered =
              c.lastNotifiedTotal > 0 &&
              (c.growth / c.lastNotifiedTotal) * 100 >= gt.value;
          }

          if (triggered) {
            userGrowth.push({
              clusterId: c.outbreak.clusterId,
              total: c.outbreak.total,
              previousTotal: c.lastNotifiedTotal,
              counties: c.outbreak.counties,
              summary: c.outbreak.summary,
              analysis_profile: c.outbreak.analysis_profile,
            });
            clustersNotified.add(c.outbreak.clusterId);
          }
        }
      }

      if (!userNewOutbreaks.length && !userGrowth.length) continue;

      if (frequency === 'immediate') {
        if (userNewOutbreaks.length) {
          await this.mailService.sendMail(
            [user.email],
            'MIMOSA Outbreak Alert',
            buildAlertEmail(userNewOutbreaks),
            buildAlertText(userNewOutbreaks),
          );
          totalSent++;
        }
      } else {
        for (const o of userNewOutbreaks) {
          await this.pendingNotificationModel.findOneAndUpdate(
            { userId: user._id, clusterId: o.clusterId, type: 'outbreak' },
            {
              $set: {
                total: o.total,
                counties: o.counties,
                analysis_profile: o.analysis_profile,
                summary: o.summary,
                type: 'outbreak',
                createdAt: new Date(),
              },
            },
            { upsert: true, new: true },
          );
        }
      }

      // Growth is always batched — dispatched on the user's growthFrequency schedule
      for (const o of userGrowth) {
        await this.pendingNotificationModel.findOneAndUpdate(
          { userId: user._id, clusterId: o.clusterId, type: 'growth' },
          {
            $set: {
              total: o.total,
              previousTotal: o.previousTotal,
              counties: o.counties,
              analysis_profile: o.analysis_profile,
              summary: o.summary,
              type: 'growth',
              createdAt: new Date(),
            },
          },
          { upsert: true, new: true },
        );
      }
    }

    // Update existing notification records.
    // lastNotifiedTotal resets when any growth notification fired (prevents
    // re-alerting the same growth on the next check).
    // lastRefreshTotal / lastGrowthAt are for idle-status tracking only.
    for (const c of growthCandidates) {
      const update: Record<string, unknown> = { lastTotal: c.outbreak.total };
      if (clustersNotified.has(c.outbreak.clusterId)) {
        update.lastNotifiedTotal = c.outbreak.total;
      }
      if (c.growth >= rules.alertMinGrowthForRefresh) {
        update.lastGrowthAt = now;
        update.lastRefreshTotal = c.outbreak.total;
      }
      await this.notificationModel.updateOne(
        { _id: c.existing._id },
        { $set: update },
      );
    }

    await this.notificationModel.insertMany(
      newOutbreaks.map((o) => ({
        clusterId: o.clusterId,
        total: o.total,
        counties: o.counties,
        sampleIds: o.sampleIds,
        analysis_profile: o.analysis_profile,
        sentAt: now,
        lastGrowthAt: now,
        lastTotal: o.total,
        lastRefreshTotal: o.total,
        lastNotifiedTotal: o.total,
      })),
    );

    console.log(
      `[Notifications] Sent ${totalSent} immediate alert(s) for ${analysis_profile}`,
    );
  }

  @Cron('0 8 * * *')
  async sendDailyNotifications() {
    const users = await this.userModel.find({
      $or: [
        {
          'notificationPreferences.outbreakAlerts': true,
          'notificationPreferences.frequency': 'daily',
        },
        {
          'notificationPreferences.growthAlerts': true,
          'notificationPreferences.growthFrequency': 'daily',
        },
      ],
    });

    for (const user of users) {
      const prefs = user.notificationPreferences || {};
      const wantsOutbreaks =
        prefs.outbreakAlerts && prefs.frequency === 'daily';
      const wantsGrowth =
        prefs.growthAlerts && prefs.growthFrequency === 'daily';

      const [rawOutbreaks, rawGrowth] = await Promise.all([
        wantsOutbreaks
          ? this.pendingNotificationModel.find({
              userId: user._id,
              type: 'outbreak',
            })
          : Promise.resolve([]),
        wantsGrowth
          ? this.pendingNotificationModel.find({
              userId: user._id,
              type: 'growth',
            })
          : Promise.resolve([]),
      ]);

      if (!rawOutbreaks.length && !rawGrowth.length) continue;

      const outbreakData: OutbreakData[] = rawOutbreaks.map((p) => ({
        clusterId: p.clusterId,
        total: p.total,
        counties: p.counties,
        summary: p.summary || '',
      }));

      const growthData: GrowthData[] = rawGrowth.map((p) => ({
        clusterId: p.clusterId,
        total: p.total,
        previousTotal: p.previousTotal ?? p.total,
        counties: p.counties,
        summary: p.summary || '',
        analysis_profile: p.analysis_profile,
      }));

      await this.mailService.sendMail(
        [user.email],
        'MIMOSA Daily Outbreak Summary',
        buildDailyDigestEmail(outbreakData, growthData),
        buildDailyDigestText(outbreakData, growthData),
      );

      if (rawOutbreaks.length)
        await this.pendingNotificationModel.deleteMany({
          userId: user._id,
          type: 'outbreak',
        });
      if (rawGrowth.length)
        await this.pendingNotificationModel.deleteMany({
          userId: user._id,
          type: 'growth',
        });
    }

    console.log('[Notifications] Daily notifications sent');
  }

  @Cron('0 8 * * 1')
  async sendWeeklyNotifications() {
    const users = await this.userModel.find({
      $or: [
        {
          'notificationPreferences.outbreakAlerts': true,
          'notificationPreferences.frequency': 'weekly',
        },
        {
          'notificationPreferences.growthAlerts': true,
          'notificationPreferences.growthFrequency': 'weekly',
        },
      ],
    });

    for (const user of users) {
      const prefs = user.notificationPreferences || {};
      const wantsOutbreaks =
        prefs.outbreakAlerts && prefs.frequency === 'weekly';
      const wantsGrowth =
        prefs.growthAlerts && prefs.growthFrequency === 'weekly';

      const [rawOutbreaks, rawGrowth] = await Promise.all([
        wantsOutbreaks
          ? this.pendingNotificationModel.find({
              userId: user._id,
              type: 'outbreak',
            })
          : Promise.resolve([]),
        wantsGrowth
          ? this.pendingNotificationModel.find({
              userId: user._id,
              type: 'growth',
            })
          : Promise.resolve([]),
      ]);

      if (!rawOutbreaks.length && !rawGrowth.length) continue;

      const outbreakData: OutbreakData[] = rawOutbreaks.map((p) => ({
        clusterId: p.clusterId,
        total: p.total,
        counties: p.counties,
        summary: p.summary || '',
      }));

      const growthData: GrowthData[] = rawGrowth.map((p) => ({
        clusterId: p.clusterId,
        total: p.total,
        previousTotal: p.previousTotal ?? p.total,
        counties: p.counties,
        summary: p.summary || '',
        analysis_profile: p.analysis_profile,
      }));

      await this.mailService.sendMail(
        [user.email],
        'MIMOSA Weekly Outbreak Summary',
        buildWeeklyDigestEmail(outbreakData, growthData),
        buildWeeklyDigestText(outbreakData, growthData),
      );

      if (rawOutbreaks.length)
        await this.pendingNotificationModel.deleteMany({
          userId: user._id,
          type: 'outbreak',
        });
      if (rawGrowth.length)
        await this.pendingNotificationModel.deleteMany({
          userId: user._id,
          type: 'growth',
        });
    }

    console.log('[Notifications] Weekly notifications sent');
  }
}
