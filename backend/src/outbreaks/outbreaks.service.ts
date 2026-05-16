import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ClusteringService } from '../clustering/clustering.service';
import { FeaturesService } from '../features/features.service';
import { Feature } from '../features/features.schema';
import { OutbreakDetectedEvent } from './outbreak-detected.event';
import { LocationResolver } from '../utils/location-resolver';
import outbreakRules from '../config/outbreak-rules.json';

type OutbreakResult = {
  clusterId: string;
  total: number;
  counties: string[];
  sampleIds: string[];
  analysis_profile: string;
  summary: string;
};

type ClusterEntry = {
  count: number;
  counties: Set<string>;
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

  private async buildPostCodeMap(
    ids: string[],
  ): Promise<Record<string, string>> {
    const features = await this.featuresService.findByIds(ids);
    const map: Record<string, string> = {};

    for (const f of features) {
      const id = f.properties?.ID;
      const county = this.locationResolver.resolveToCounty({
        Hospital: f.properties?.Hospital,
        PostCode: f.properties?.PostCode,
        manualCoordinates: f.properties?.manualCoordinates,
      });
      if (id && county) {
        map[id] = county;
      }
    }

    return map;
  }

  private getRules(analysis_profile: string): {
    detectionThreshold: number;
    requireCountyResolution: boolean;
  } {
    const profiles = outbreakRules.profiles as Record<
      string,
      { detectionThreshold: number; requireCountyResolution: boolean }
    >;
    return profiles[analysis_profile] ?? outbreakRules.default;
  }

  private detectOutbreaks(
    results: { ID: string; Cluster_ID: string; Partition: string }[],
    postCodeMap: Record<string, string>,
    analysis_profile: string,
  ): {
    clusterId: string;
    total: number;
    counties: string[];
    sampleIds: string[];
  }[] {
    const rules = this.getRules(analysis_profile);
    const clusterMap: Record<string, ClusterEntry> = {};

    for (const r of results) {
      const clusterId = String(r.Cluster_ID);
      if (!clusterId || clusterId === 'Unknown') continue;
      const county = postCodeMap[r.ID];
      if (rules.requireCountyResolution && !county) continue;
      if (!clusterMap[clusterId]) {
        clusterMap[clusterId] = {
          count: 0,
          counties: new Set(),
          sampleIds: [],
        };
      }
      clusterMap[clusterId].count += 1;
      if (county) clusterMap[clusterId].counties.add(county);
      clusterMap[clusterId].sampleIds.push(r.ID);
    }

    return Object.entries(clusterMap)
      .filter(([_, { count }]) => count >= rules.detectionThreshold)
      .map(([clusterId, { count, counties, sampleIds }]) => ({
        clusterId,
        total: count,
        counties: [...counties],
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

  async getLatestOutbreaks(
    analysis_profile: string,
  ): Promise<OutbreakResult[]> {
    const clustering =
      await this.clusteringService.findLatestByProfile(analysis_profile);
    if (!clustering) return [];

    const ids = clustering.results.map((r) => r.ID);
    const postCodeMap = await this.buildPostCodeMap(ids);
    const outbreaks = this.detectOutbreaks(
      clustering.results,
      postCodeMap,
      analysis_profile,
    );

    return outbreaks.map((o) => ({
      ...o,
      analysis_profile: clustering.analysis_profile,
      summary: this.formatOutbreak(o),
    }));
  }
}
