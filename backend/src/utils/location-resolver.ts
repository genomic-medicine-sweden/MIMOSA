const hospitalCoordinatesRaw = require('@shared/hospital-coordinates.js');
const hospitalCoordinates =
  hospitalCoordinatesRaw.default || hospitalCoordinatesRaw;

const postcodeCoordinatesRaw = require('@shared/postcode-coordinates.js');
const postcodeCoordinates =
  postcodeCoordinatesRaw.default || postcodeCoordinatesRaw;

function normalise(value?: string): string {
  return value?.trim().toLowerCase() || '';
}

function normalisePostcode(value?: string): string {
  if (!value) return '';
  return value.replace(/\s+/g, '').toUpperCase();
}

export function resolveToCounty({
  Hospital,
  PostCode,
}: {
  Hospital?: string;
  PostCode?: string;
}): string | null {
  if (Hospital) {
    const hospitalKey = Object.keys(hospitalCoordinates).find(
      (k) => normalise(k) === normalise(Hospital),
    );

    if (!hospitalKey) {
      console.warn('Unknown hospital:', Hospital);
      return null;
    }

    const pc = hospitalCoordinates[hospitalKey].PostCode;

    if (!pc) {
      console.warn('Hospital missing postcode:', Hospital);
      return null;
    }

    const postcodeKey = Object.keys(postcodeCoordinates).find(
      (k) => normalisePostcode(k) === normalisePostcode(pc),
    );

    if (!postcodeKey) {
      console.warn('Postcode not found:', pc);
      return null;
    }

    return postcodeCoordinates[postcodeKey].County || null;
  }

  if (PostCode) {
    const postcodeKey = Object.keys(postcodeCoordinates).find(
      (k) => normalisePostcode(k) === normalisePostcode(PostCode),
    );

    if (!postcodeKey) {
      console.warn('Unknown postcode:', PostCode);
      return null;
    }

    return postcodeCoordinates[postcodeKey].County || null;
  }

  return null;
}
