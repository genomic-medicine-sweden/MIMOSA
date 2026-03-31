import { Injectable } from '@nestjs/common';
import { ClusteringService } from '../clustering/clustering.service';
import { FeaturesService } from '../features/features.service';

@Injectable()
export class OutbreaksService {
  constructor(
    private readonly clusteringService: ClusteringService,
    private readonly featuresService: FeaturesService,
  ) {}

  private async buildPostCodeMap(
    ids: string[],
  ): Promise<Record<string, string>> {
    const features = await this.featuresService.findByIds(ids);
    console.log('=== FEATURES FOUND BY IDS ===', features.length);
    console.log(
      '=== SAMPLE FEATURE PROPERTIES ===',
      JSON.stringify(features[0]?.properties),
    );

    const map: Record<string, string> = {};

    for (const f of features) {
      const id = f.properties?.ID;
      const location = f.properties?.PostCode || f.properties?.Hospital;
      if (id && location) {
        map[id] = location;
      }
    }

    return map;
  }
  private detectOutbreaks(
    results: { ID: string; Cluster_ID: string; Partition: string }[],
    postCodeMap: Record<string, string>,
  ): { clusterId: string; total: number; counties: string[] }[] {
    const clusterMap: Record<string, { count: number; counties: Set<string> }> =
      {};

    for (const r of results) {
      const clusterId = String(r.Cluster_ID);
      if (!clusterId || clusterId === 'Unknown') continue;

      const postCode = postCodeMap[r.ID];
      if (!postCode) continue;

      if (!clusterMap[clusterId]) {
        clusterMap[clusterId] = { count: 0, counties: new Set() };
      }

      clusterMap[clusterId].count += 1;
      clusterMap[clusterId].counties.add(postCode);
    }

    return Object.entries(clusterMap)
      .filter(([_, { count }]) => count >= 2)
      .map(([clusterId, { count, counties }]) => ({
        clusterId,
        total: count,
        counties: [...counties],
      }));
  }

  async getLatestOutbreaks(analysis_profile: string): Promise<
    {
      clusterId: string;
      total: number;
      counties: string[];
      analysis_profile: string;
    }[]
  > {
    console.log(
      '=== ALL CLUSTERINGS COUNT === getting latest for',
      analysis_profile,
    );

    const clustering =
      await this.clusteringService.findLatestByProfile(analysis_profile);
    console.log('=== CLUSTERING FOUND ===', !!clustering);

    if (!clustering) return [];

    const ids = clustering.results.map((r) => r.ID);
    console.log('=== IDS ===', JSON.stringify(ids));
    console.log('=== IDS COUNT ===', ids.length);

    const postCodeMap = await this.buildPostCodeMap(ids);
    console.log('=== POSTCODE MAP ===', JSON.stringify(postCodeMap));

    const outbreaks = this.detectOutbreaks(clustering.results, postCodeMap);
    console.log('=== DETECTED OUTBREAKS ===', JSON.stringify(outbreaks));

    return outbreaks.map((o) => ({
      ...o,
      analysis_profile: clustering.analysis_profile,
    }));
  }
}
