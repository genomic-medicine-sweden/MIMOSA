import { Injectable, Inject } from '@nestjs/common';
import mapConfig from '../config/map-config';

export const COORDINATES_TOKEN = 'MAP_COORDINATES';

export type CoordinatesPayload = {
  postcodeCoordinates: Record<string, any>;
  hospitalCoordinates: Record<string, any>;
  boundariesData: Record<string, any>;
  postcodePrefix: string;
};

@Injectable()
export class MapConfigService {
  constructor(
    @Inject(COORDINATES_TOKEN) private readonly coordinates: CoordinatesPayload,
  ) {}

  getConfig() {
    return mapConfig;
  }

  getCoordinates() {
    return {
      postcodeCoordinates: this.coordinates.postcodeCoordinates,
      hospitalCoordinates: this.coordinates.hospitalCoordinates,
    };
  }

  getBoundaries() {
    return this.coordinates.boundariesData;
  }
}
