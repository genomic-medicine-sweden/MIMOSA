import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ClusteringService } from '../clustering/clustering.service';
import { FeaturesService } from '../features/features.service';
import { Feature } from '../features/features.schema';
import { Notification } from '../notifications/notification.schema';
import { OutbreakDetectedEvent } from './outbreak-detected.event';
import { LocationResolver } from '../utils/location-resolver';
import outbreakRules from '../config/outbreak-rules.json';

type OutbreakResult = {
  clusterId: string;
  total: number;
  counties: string[];
  hospitals: string[];
  sampleIds: string[];
  analysis_profile: string;
  summary: string;
  isIdle: boolean;
  daysSinceLastGrowth: number | null;
};

type ClusterEntry = {
  count: number;
  counties: Set<string>;
  hospitals: Set<string>;
  sampleIds: string[];
};

@Injectable()
export class OutbreaksService implements OnModuleInit {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly clusteringService: ClusteringService,
    private readonly featuresService: FeaturesService,
    @InjectModel(Feature.name)
    private readonly featureModel: Model<Feature>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    private readonly eventEmitter: EventEmitter2,
    private readonly locationResolver: LocationResolver,
  ) {}

  async onModuleInit() {
    if (process.env.MIMOSA_SCRIPT_MODE === 'true') return;
    console.log('[Outbreaks] Initializing change streams...');

    const clusteringStream = this.clusteringService.watch();

    clusteringStream.on('change', (change) => {
      try {
        if (change.operationType !== 'insert') return;
        const analysis_profile = change.fullDocument?.analysis_profile;
        if (!analysis_profile) return;
        this.scheduleOutbreakCheck(analysis_profile);
        this.eventEmitter.emit('features.changed', { operationType: 'insert' });
      } catch (err) {
        console.error('[Outbreaks] Clustering change error:', err);
      }
    });

    clusteringStream.on('error', (err) => {
      if (err.name !== 'MongoClientClosedError') {
        console.error('[Outbreaks] Clustering stream error:', err);
      }
    });

    const featureStream = this.featureModel.watch();

    featureStream.on('change', async (change) => {
      try {
        if (
          !['insert', 'update', 'replace', 'delete'].includes(
            change.operationType,
          )
        )
          return;

        this.eventEmitter.emit('features.changed', {
          operationType: change.operationType,
        });

        if (change.operationType === 'delete') {
          const profiles = await this.featureModel.distinct(
            'properties.analysis_profile',
          );
          for (const profile of profiles) {
            this.scheduleOutbreakCheck(profile);
          }
          return;
        }
        const docId = change.documentKey?._id;
        if (!docId) return;
        const feature = await this.featureModel.findById(docId);
        const analysis_profile = feature?.properties?.analysis_profile;
        if (!analysis_profile) return;
        this.scheduleOutbreakCheck(analysis_profile);
      } catch (err) {
        console.error('[Outbreaks] Feature change error:', err);
      }
    });

    featureStream.on('error', (err) => {
      if (err.name !== 'MongoClientClosedError') {
        console.error('[Outbreaks] Feature stream error:', err);
      }
    });

    console.log('[Outbreaks] Change streams ready');
  }

  private scheduleOutbreakCheck(analysis_profile: string) {
    const existing = this.debounceTimers.get(analysis_profile);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(analysis_profile);
      this.checkAndEmit(analysis_profile).catch((err) =>
        console.error(
          `[Outbreaks] Error checking outbreaks for ${analysis_profile}:`,
          err,
        ),
      );
    }, 5000);

    this.debounceTimers.set(analysis_profile, timer);
  }

  private async checkAndEmit(analysis_profile: string) {
    const outbreaks = await this.getLatestOutbreaks(analysis_profile);
    if (!outbreaks?.length) return;

    this.eventEmitter.emit(
      'outbreaks.detected',
      new OutbreakDetectedEvent(analysis_profile, outbreaks),
    );
  }

  private async buildLocationMap(
    ids: string[],
  ): Promise<
    Record<string, { county: string; hospital?: string; postcode?: string }>
  > {
    const features = await this.featuresService.findByIds(ids);
    const map: Record<
      string,
      { county: string; hospital?: string; postcode?: string }
    > = {};

    for (const f of features) {
      const id = f.properties?.ID;
      const county = this.locationResolver.resolveToCounty({
        Hospital: f.properties?.Hospital,
        PostCode: f.properties?.PostCode,
        manualCoordinates: f.properties?.manualCoordinates,
      });
      if (id && county) {
        map[id] = {
          county,
          hospital: f.properties?.Hospital || undefined,
          postcode: f.properties?.PostCode || undefined,
        };
      }
    }

    return map;
  }

  private getRules(analysis_profile: string): {
    detectionThreshold: number;
    requireCountyResolution: boolean;
    alertVisibilityDays: number | null;
    alertMinGrowthForRefresh: number;
  } {
    const profiles = outbreakRules.profiles as Record<
      string,
      {
        detectionThreshold: number;
        requireCountyResolution: boolean;
        alertVisibilityDays?: number | null;
        alertMinGrowthForRefresh?: number;
      }
    >;
    const profile = profiles[analysis_profile];
    return {
      detectionThreshold:
        profile?.detectionThreshold ?? outbreakRules.default.detectionThreshold,
      requireCountyResolution:
        profile?.requireCountyResolution ??
        outbreakRules.default.requireCountyResolution,
      alertVisibilityDays:
        profile?.alertVisibilityDays !== undefined
          ? profile.alertVisibilityDays
          : outbreakRules.default.alertVisibilityDays,
      alertMinGrowthForRefresh:
        profile?.alertMinGrowthForRefresh ??
        outbreakRules.default.alertMinGrowthForRefresh,
    };
  }

  private detectOutbreaks(
    results: { ID: string; Cluster_ID: string; Partition: string }[],
    locationMap: Record<
      string,
      { county: string; hospital?: string; postcode?: string }
    >,
    analysis_profile: string,
  ): {
    clusterId: string;
    total: number;
    counties: string[];
    hospitals: string[];
    sampleIds: string[];
  }[] {
    const rules = this.getRules(analysis_profile);
    const clusterMap: Record<string, ClusterEntry> = {};

    for (const r of results) {
      const clusterId = String(r.Cluster_ID);
      if (!clusterId || clusterId === 'Unknown') continue;
      const location = locationMap[r.ID];
      const county = location?.county;
      if (rules.requireCountyResolution && !county) continue;
      if (!clusterMap[clusterId]) {
        clusterMap[clusterId] = {
          count: 0,
          counties: new Set(),
          hospitals: new Set(),
          sampleIds: [],
        };
      }
      clusterMap[clusterId].count += 1;
      if (county) clusterMap[clusterId].counties.add(county);
      if (location?.hospital)
        clusterMap[clusterId].hospitals.add(location.hospital);
      clusterMap[clusterId].sampleIds.push(r.ID);
    }

    return Object.entries(clusterMap)
      .filter(([_, { count }]) => count >= rules.detectionThreshold)
      .map(([clusterId, { count, counties, hospitals, sampleIds }]) => ({
        clusterId,
        total: count,
        counties: [...counties],
        hospitals: [...hospitals],
        sampleIds,
      }));
  }

  private formatOutbreak(o: {
    clusterId: string;
    total: number;
    counties: string[];
  }): string {
    const countyCount = o.counties.length;

    const formatCounties = () => {
      if (countyCount === 1) return `in ${o.counties[0]}`;
      if (countyCount === 2) return `in ${o.counties[0]} and ${o.counties[1]}`;
      if (countyCount <= 3)
        return `in ${o.counties.slice(0, -1).join(', ')} and ${o.counties[countyCount - 1]}`;
      return `across ${countyCount} counties`;
    };

    return `Cluster ${o.clusterId} — ${o.total} case${o.total !== 1 ? 's' : ''} ${formatCounties()}`;
  }

  private async annotateIdleStatus(
    outbreaks: Omit<OutbreakResult, 'isIdle' | 'daysSinceLastGrowth'>[],
    analysis_profile: string,
  ): Promise<OutbreakResult[]> {
    if (!outbreaks.length) return [];

    const rules = this.getRules(analysis_profile);

    if (rules.alertVisibilityDays === null) {
      return outbreaks.map((o) => ({
        ...o,
        isIdle: false,
        daysSinceLastGrowth: null,
      }));
    }

    const notifications = await this.notificationModel.find({
      clusterId: { $in: outbreaks.map((o) => o.clusterId) },
      analysis_profile,
    });

    const notifMap = new Map(notifications.map((n) => [n.clusterId, n]));
    const now = new Date();

    return outbreaks.map((o) => {
      const notif = notifMap.get(o.clusterId);
      const lastGrowthAt = notif?.lastGrowthAt ?? notif?.sentAt ?? null;

      if (!lastGrowthAt) {
        return { ...o, isIdle: false, daysSinceLastGrowth: null };
      }

      const daysSinceLastGrowth = Math.floor(
        (now.getTime() - lastGrowthAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      const isIdle = daysSinceLastGrowth >= rules.alertVisibilityDays!;

      return { ...o, isIdle, daysSinceLastGrowth };
    });
  }

  async getAllProfiles(): Promise<string[]> {
    return this.featureModel.distinct('properties.analysis_profile');
  }

  async getActiveProfiles(): Promise<string[]> {
    const profiles = await this.featureModel.distinct(
      'properties.analysis_profile',
    );
    const results = await Promise.all(
      profiles.map(async (profile: string) => {
        const outbreaks = await this.getLatestOutbreaks(profile);
        return outbreaks.length > 0 ? profile : null;
      }),
    );
    return results.filter((p: string | null): p is string => p !== null);
  }

  async getLatestOutbreaks(
    analysis_profile: string,
  ): Promise<OutbreakResult[]> {
    const clustering =
      await this.clusteringService.findLatestByProfile(analysis_profile);
    if (!clustering) return [];

    const ids = clustering.results.map((r) => r.ID);
    const locationMap = await this.buildLocationMap(ids);
    const outbreaks = this.detectOutbreaks(
      clustering.results,
      locationMap,
      analysis_profile,
    );

    const baseResults = outbreaks.map((o) => ({
      ...o,
      hospitals: o.hospitals,
      analysis_profile: clustering.analysis_profile,
      summary: this.formatOutbreak(o),
    }));

    return this.annotateIdleStatus(baseResults, analysis_profile);
  }
}
