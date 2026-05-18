import * as turf from "@turf/turf";
import {
  getPostcodeCoordinates,
  getPostcodePrefix,
  getBoundariesData,
  getRegionNameKey,
} from "@/utils/coordinates";

export function getCounty(postcode, manualCoordinates) {
  if (postcode) {
    const entry = getPostcodeCoordinates()[postcode];
    if (entry && entry.County !== "0") return entry.County;
  }
  if (manualCoordinates?.lat != null && manualCoordinates?.lng != null) {
    const boundaries = getBoundariesData();
    const nameKey = getRegionNameKey();
    if (boundaries) {
      const point = turf.point([
        Number(manualCoordinates.lng),
        Number(manualCoordinates.lat),
      ]);
      for (const feature of boundaries.features) {
        const geom = feature.geometry;
        if (
          (geom.type === "Polygon" || geom.type === "MultiPolygon") &&
          turf.booleanPointInPolygon(point, feature)
        ) {
          return feature.properties[nameKey] || "";
        }
      }
    }
  }
  return "";
}

export function getPostalTown(postcode, manualCoordinates) {
  if (postcode) {
    const entry = getPostcodeCoordinates()[postcode];
    if (entry && entry.postaltown !== "0") return entry.postaltown;
  }
  if (manualCoordinates?.lat != null && manualCoordinates?.lng != null) {
    const lat = Number(manualCoordinates.lat);
    const lng = Number(manualCoordinates.lng);
    let minDist = Infinity;
    let best = null;
    for (const data of Object.values(getPostcodeCoordinates())) {
      const [pcLat, pcLng] = data.coordinates;
      const dist = (pcLat - lat) ** 2 + (pcLng - lng) ** 2;
      if (dist < minDist) {
        minDist = dist;
        best = data;
      }
    }
    return best?.postaltown && best.postaltown !== "0" ? best.postaltown : "";
  }
  return "";
}

export function formatPostcode(postcode) {
  if (!postcode) return "";
  const prefix = getPostcodePrefix();
  return postcode.startsWith(prefix) ? postcode.slice(prefix.length) : postcode;
}

export function resolveCounty(postcode) {
  return getCounty(postcode);
}
