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

  private readonly unknownHospitals = new Set<string>();
  private readonly unknownPostcodes = new Set<string>();
  private summaryTimer: NodeJS.Timeout | null = null;

  constructor(@Inject(COORDINATES_TOKEN) coords: CoordinatesPayload) {
    this.hospitalCoordinates = coords.hospitalCoordinates;
    this.postcodeCoordinates = coords.postcodeCoordinates;
    this.postcodePrefix = coords.postcodePrefix ?? '';
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

  resolveToCounty({
    Hospital,
    PostCode,
  }: {
    Hospital?: string;
    PostCode?: string;
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

    return null;
  }
}
