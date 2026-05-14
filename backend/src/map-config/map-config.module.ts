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

const country = mapConfig.activeMap;
const hospitals = tryLoadJs(`${country}-hospital-coordinates.js`);
const postcodes = tryLoadJs(`${country}-postcode-coordinates.js`);
const boundaries = tryLoadJson(`${country}-with-regions.json`);

if (hospitals === null || postcodes === null) {
  console.warn(
    `[map-config] No coordinate files found for activeMap "${country}". ` +
      `Sample markers will not be visible. ` +
      `Add geodata/${country}-hospital-coordinates.js and ` +
      `geodata/${country}-postcode-coordinates.js to enable marker plotting.`,
  );
}

if (boundaries === null) {
  throw new Error(
    `[map-config] No boundaries file found for activeMap "${country}". ` +
      `Add geodata/${country}-with-regions.json to continue.`,
  );
}

const coordinatesProvider = {
  provide: COORDINATES_TOKEN,
  useValue: {
    postcodeCoordinates: postcodes ?? {},
    hospitalCoordinates: hospitals ?? {},
    boundariesData: boundaries,
    postcodePrefix: mapConfig.postcodePrefix,
  },
};

@Module({
  controllers: [MapConfigController],
  providers: [coordinatesProvider, MapConfigService, LocationResolver],
  exports: [MapConfigService, LocationResolver, coordinatesProvider],
})
export class MapConfigModule {}
