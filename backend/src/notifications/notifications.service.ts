import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Feature } from '../features/features.schema';
import { Notification } from './notification.schema';
import { User } from '../users/users.schema';

import { ClusteringService } from '../clustering/clustering.service';
import { OutbreaksService } from './outbreaks.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    @InjectModel(Feature.name)
    private readonly featureModel: Model<Feature>,

    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    private readonly clusteringService: ClusteringService,
    private readonly outbreaksService: OutbreaksService,
    private readonly mailService: MailService,
  ) {}

  private scheduleOutbreakCheck(analysis_profile: string) {
    const existing = this.debounceTimers.get(analysis_profile);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(analysis_profile);
      this.handleNewClustering(analysis_profile).catch((err) =>
        console.error(
          `[Notifications] Error in outbreak check for ${analysis_profile}:`,
          err,
        ),
      );
    }, 5000);

    this.debounceTimers.set(analysis_profile, timer);
  }

  async onModuleInit() {
    console.log(
      '[Notifications] Service initializing, setting up change streams...',
    );

    const clusteringStream = this.clusteringService.watch();

    clusteringStream.on('change', (change) => {
      try {
        if (change.operationType !== 'insert') return;

        const analysis_profile = change.fullDocument?.analysis_profile;
        if (!analysis_profile) {
          console.warn(
            '[Notifications] Clustering insert has no analysis_profile, skipping',
          );
          return;
        }

        console.log(
          `[Notifications] New clustering inserted for profile: ${analysis_profile}, scheduling outbreak check in 5s...`,
        );
        this.scheduleOutbreakCheck(analysis_profile);
      } catch (err) {
        console.error(
          '[Notifications] Error handling clustering change event:',
          err,
        );
      }
    });

    clusteringStream.on('error', (err) => {
      console.error('[Notifications] Clustering change stream error:', err);
    });

    const featureStream = this.featureModel.watch();

    featureStream.on('change', async (change) => {
      try {
        if (!['insert', 'update', 'replace'].includes(change.operationType))
          return;

        const docId = change.documentKey?._id;
        if (!docId) {
          console.warn(
            '[Notifications] Feature change has no documentKey, skipping',
          );
          return;
        }

        const feature = await this.featureModel.findById(docId);
        if (!feature) {
          console.warn(
            `[Notifications] Feature ${docId} not found after change, skipping`,
          );
          return;
        }

        const analysis_profile = feature.properties?.analysis_profile;
        if (!analysis_profile) {
          console.warn(
            `[Notifications] Feature ${docId} has no analysis_profile, skipping`,
          );
          return;
        }

        console.log(
          `[Notifications] Feature ${docId} updated for profile: ${analysis_profile}, scheduling outbreak check in 5s...`,
        );
        this.scheduleOutbreakCheck(analysis_profile);
      } catch (err) {
        console.error(
          '[Notifications] Error handling feature change event:',
          err,
        );
      }
    });

    featureStream.on('error', (err) => {
      console.error('[Notifications] Feature change stream error:', err);
    });

    console.log(
      '[Notifications] Change streams ready — watching clustering and features collections',
    );
  }

  private async handleNewClustering(analysis_profile: string) {
    console.log(
      `[Notifications] Running outbreak check for profile: ${analysis_profile}`,
    );

    const outbreaks =
      await this.outbreaksService.getLatestOutbreaks(analysis_profile);

    if (!outbreaks || outbreaks.length === 0) {
      console.log(
        `[Notifications] No outbreaks detected for ${analysis_profile} — no email sent`,
      );
      return;
    }

    console.log(
      `[Notifications] ${outbreaks.length} outbreak(s) detected for ${analysis_profile}, checking for new ones...`,
    );

    const newOutbreaks: typeof outbreaks = [];

    for (const o of outbreaks) {
      const exists = await this.notificationModel.findOne({
        clusterId: o.clusterId,
      });

      if (!exists) {
        newOutbreaks.push(o);

        await this.notificationModel.create({
          clusterId: o.clusterId,
          total: o.total,
          counties: o.counties,
          analysis_profile: o.analysis_profile,
        });
      }
    }

    if (newOutbreaks.length === 0) {
      console.log(
        `[Notifications] All outbreaks for ${analysis_profile} have already been notified — no email sent`,
      );
      return;
    }

    const users = await this.userModel.find({
      'notificationPreferences.outbreakAlerts': true,
    });

    if (!users.length) {
      console.log('[Notifications] No users configured for alerts');
      return;
    }

    let totalSent = 0;

    for (const user of users) {
      const prefs = user.notificationPreferences || {};

      const frequency = prefs.frequency || 'immediate';
      const minSize = prefs.minClusterSize ?? 1;
      const counties = prefs.counties || [];

      const relevantOutbreaks = newOutbreaks.filter((o) => {
        if (o.total < minSize) return false;

        if (counties.length > 0) {
          return o.counties.some((c) => counties.includes(c));
        }

        return true;
      });

      if (!relevantOutbreaks.length) continue;

      const message = relevantOutbreaks
        .map(
          (o) =>
            `Cluster ${o.clusterId}: ${o.total} cases across ${o.counties.join(', ')}`,
        )
        .join('\n');

      if (frequency === 'immediate') {
        await this.mailService.sendMail(
          [user.email],
          'MIMOSA Outbreak Alert',
          message,
        );
        totalSent++;
      } else {
        // TODO: queue for daily/weekly notifications
      }
    }

    console.log(
      `[Notifications] Sent alerts to ${totalSent} user(s) for ${analysis_profile}`,
    );
  }
}
