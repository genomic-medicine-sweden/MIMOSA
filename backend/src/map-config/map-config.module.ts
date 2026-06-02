import { Module } from '@nestjs/common';
import { MapConfigController } from './map-config.controller';
import { MapConfigService, COORDINATES_TOKEN } from './map-config.service';
import { LocationResolver } from '../utils/location-resolver';
import mapConfig from '../config/map-config';
import * as fs from 'fs';
import * as path from 'path';

const sharedDir = path.resolve(process.cwd(), '..', 'geodata');

const nativeRequire = eval('require');

function tryLoadJs(filename: string): any | null {
  const filePath = path.join(sharedDir, filename);
  try {
    const mod = nativeRequire(filePath);
    return mod.default ?? mod;
  } catch (e) {
    console.error(
      '[map-config] failed to load',
      filePath,
      (e as Error).message,
    );
    return null;
  }
}

function tryLoadJson(filename: string): any | null {
  const filePath = path.join(sharedDir, filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function logBoundaryKeys(geojson: any): void {
  const keys = Object.keys(geojson?.features?.[0]?.properties ?? {});
  console.log(
    `[map-config] Boundary feature property keys: ${keys.join(', ')}`,
  );
}

async function fetchGeoBoundaries(api: {
  countryCode: string;
  level: string;
}): Promise<any> {
  const metaUrl = `https://www.geoboundaries.org/api/current/gbOpen/${api.countryCode}/${api.level}/`;
  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) {
    throw new Error(
      `[map-config] geoBoundaries metadata fetch failed (${metaRes.status}) for ${api.countryCode}/${api.level}`,
    );
  }
  const meta = (await metaRes.json()) as any;
  const gjUrl = meta.gjDownloadURL;
  if (!gjUrl) {
    throw new Error(
      `[map-config] geoBoundaries returned no gjDownloadURL. Keys: ${Object.keys(meta).join(', ')}`,
    );
  }
  const gjRes = await fetch(gjUrl);
  if (!gjRes.ok) {
    throw new Error(
      `[map-config] geoBoundaries GeoJSON download failed (${gjRes.status}) from ${gjUrl}`,
    );
  }
  const geojson = await gjRes.json();
  console.log(
    `[map-config] Loaded boundaries from geoBoundaries: ${api.countryCode}/${api.level}`,
  );
  logBoundaryKeys(geojson);
  return geojson;
}

async function loadBoundaries(config: typeof mapConfig): Promise<any> {
  const { boundariesFile, boundariesApi } = config;

  if (boundariesFile) {
    const local = tryLoadJson(boundariesFile);
    if (local) {
      console.log(
        `[map-config] Loaded boundaries from local file: ${boundariesFile}`,
      );
      logBoundaryKeys(local);
      return local;
    }
    if (!boundariesApi) {
      throw new Error(
        `[map-config] Boundaries file not found: ${boundariesFile}. ` +
          `Add it to geodata/ or configure boundariesApi as fallback.`,
      );
    }
    console.warn(
      `[map-config] Boundaries file not found: ${boundariesFile}, falling back to geoBoundaries API`,
    );
  }

  return fetchGeoBoundaries(boundariesApi!);
}

const country = mapConfig.activeMap;
const hospitals = tryLoadJs(`${country}-hospital-coordinates.js`);
const postcodes = tryLoadJs(`${country}-postcode-coordinates.js`);

if (hospitals === null || postcodes === null) {
  console.warn(
    `[map-config] No coordinate files found for activeMap "${country}". ` +
      `Sample markers will not be visible. ` +
      `Add geodata/${country}-hospital-coordinates.js and ` +
      `geodata/${country}-postcode-coordinates.js to enable marker plotting.`,
  );
}

const coordinatesProvider = {
  provide: COORDINATES_TOKEN,
  useFactory: async () => {
    const boundaries = await loadBoundaries(mapConfig);
    return {
      postcodeCoordinates: postcodes ?? {},
      hospitalCoordinates: hospitals ?? {},
      boundariesData: boundaries,
      postcodePrefix: mapConfig.postcodePrefix,
    };
  },
};

@Module({
  controllers: [MapConfigController],
  providers: [coordinatesProvider, MapConfigService, LocationResolver],
  exports: [MapConfigService, LocationResolver, coordinatesProvider],
})
export class MapConfigModule {}
