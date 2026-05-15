import { getPostcodeCoordinates, getPostcodePrefix } from "@/utils/coordinates";

export function getCounty(postcode) {
  if (!postcode) return "";
  const entry = getPostcodeCoordinates()[postcode];
  return entry && entry.County !== "0" ? entry.County : "";
}

export function getPostalTown(postcode) {
  if (!postcode) return "";
  const entry = getPostcodeCoordinates()[postcode];
  return entry && entry.postaltown !== "0" ? entry.postaltown : "";
}

export function formatPostcode(postcode) {
  if (!postcode) return "";
  const prefix = getPostcodePrefix();
  return postcode.startsWith(prefix) ? postcode.slice(prefix.length) : postcode;
}

export function resolveCounty(postcode) {
  return getCounty(postcode);
}
