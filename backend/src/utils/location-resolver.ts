import { Injectable, Inject } from '@nestjs/common';
import {
  COORDINATES_TOKEN,
  CoordinatesPayload,
} from '../map-config/map-config.service';

function normalise(value?: string): string {
  return value?.trim().toLowerCase() || '';
}

function normalisePostcode(value?: string): string {
  if (!value) return '';
  return value.replace(/\s+/g, '').toUpperCase();
}

@Injectable()
export class LocationResolver {
  private readonly hospitalCoordinates: Record<string, any>;
  private readonly postcodeCoordinates: Record<string, any>;
  private readonly postcodePrefix: string;
  private readonly boundariesData: Record<string, any>;
  private readonly regionNameKey: string;

  private readonly unknownHospitals = new Set<string>();
  private readonly unknownPostcodes = new Set<string>();
  private summaryTimer: NodeJS.Timeout | null = null;

  constructor(@Inject(COORDINATES_TOKEN) coords: CoordinatesPayload) {
    this.hospitalCoordinates = coords.hospitalCoordinates;
    this.postcodeCoordinates = coords.postcodeCoordinates;
    this.postcodePrefix = coords.postcodePrefix ?? '';
    this.boundariesData = coords.boundariesData;
    this.regionNameKey = coords.regionNameKey ?? 'name';
  }

  private pointInPolygon(lat: number, lng: number, ring: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]; // GeoJSON order: [lng, lat]
      const [xj, yj] = ring[j];
      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private nearestPostcodeCounty(lat: number, lng: number): string | null {
    let minDist = Infinity;
    let county: string | null = null;
    for (const data of Object.values(this.postcodeCoordinates) as any[]) {
      const coords = data.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const [pcLat, pcLng] = coords; // postcode format: [lat, lng]
      const dist = (pcLat - lat) ** 2 + (pcLng - lng) ** 2;
      if (dist < minDist) {
        minDist = dist;
        county = data.County || null;
      }
    }
    return county;
  }

  private resolveCountyFromCoords(lat: number, lng: number): string | null {
    const features = this.boundariesData?.features;
    if (Array.isArray(features)) {
      for (const feature of features) {
        const geom = feature.geometry;
        const name = feature.properties?.[this.regionNameKey];
        if (!name || !geom) continue;

        if (geom.type === 'Polygon') {
          if (this.pointInPolygon(lat, lng, geom.coordinates[0])) return name;
        } else if (geom.type === 'MultiPolygon') {
          for (const polygon of geom.coordinates) {
            if (this.pointInPolygon(lat, lng, polygon[0])) return name;
          }
        }
      }
    }

    return this.nearestPostcodeCounty(lat, lng);
  }

  private scheduleSummary() {
    if (this.summaryTimer) return;
    this.summaryTimer = setTimeout(() => {
      this.summaryTimer = null;
      if (this.unknownHospitals.size > 0) {
        const examples = [...this.unknownHospitals].slice(0, 3).join('", "');
        console.warn(
          `[location-resolver] No coordinates found for ${this.unknownHospitals.size} location(s) ` +
            `e.g. "${examples}" - affected samples will not appear on map.`,
        );
      }
      if (this.unknownPostcodes.size > 0) {
        const examples = [...this.unknownPostcodes].slice(0, 3).join('", "');
        console.warn(
          `[location-resolver] No coordinates found for ${this.unknownPostcodes.size} postcode(s) ` +
            `e.g. "${examples}" - affected samples will not appear on map.`,
        );
      }
      this.unknownHospitals.clear();
      this.unknownPostcodes.clear();
    }, 5000);
  }

  private findPostcodeKey(postcode: string): string | undefined {
    const norm = normalisePostcode(postcode);
    const direct = Object.keys(this.postcodeCoordinates).find(
      (k) => normalisePostcode(k) === norm,
    );
    if (direct) return direct;
    if (this.postcodePrefix) {
      const prefixed = normalisePostcode(this.postcodePrefix + postcode);
      return Object.keys(this.postcodeCoordinates).find(
        (k) => normalisePostcode(k) === prefixed,
      );
    }
    return undefined;
  }

  getAllHospitalNames(): string[] {
    return Object.keys(this.hospitalCoordinates).sort();
  }

  resolveToCounty({
    Hospital,
    PostCode,
    manualCoordinates,
  }: {
    Hospital?: string;
    PostCode?: string;
    manualCoordinates?: { lat: number; lng: number } | null;
  }): string | null {
    if (Hospital) {
      const hospitalKey = Object.keys(this.hospitalCoordinates).find(
        (k) => normalise(k) === normalise(Hospital),
      );
      if (!hospitalKey) {
        this.unknownHospitals.add(Hospital);
        this.scheduleSummary();
        return null;
      }
      const pc = this.hospitalCoordinates[hospitalKey].PostCode;
      if (!pc) {
        this.unknownHospitals.add(Hospital);
        this.scheduleSummary();
        return null;
      }
      const postcodeKey = this.findPostcodeKey(pc);
      if (!postcodeKey) {
        this.unknownPostcodes.add(pc);
        this.scheduleSummary();
        return null;
      }
      return this.postcodeCoordinates[postcodeKey].County || null;
    }

    if (PostCode) {
      const postcodeKey = this.findPostcodeKey(PostCode);
      if (!postcodeKey) {
        this.unknownPostcodes.add(PostCode);
        this.scheduleSummary();
        return null;
      }
      return this.postcodeCoordinates[postcodeKey].County || null;
    }

    if (manualCoordinates?.lat != null && manualCoordinates?.lng != null) {
      return this.resolveCountyFromCoords(
        manualCoordinates.lat,
        manualCoordinates.lng,
      );
    }

    return null;
  }
}
