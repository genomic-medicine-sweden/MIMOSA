import postcodeData from "@shared/postcode-coordinates";

export function getCounty(postcode) {
  if (!postcode) return "";
  const entry = postcodeData[postcode];
  return entry && entry.County !== "0" ? entry.County : "";
}

export function getPostalTown(postcode) {
  if (!postcode) return "";
  const entry = postcodeData[postcode];
  return entry && entry.postaltown !== "0" ? entry.postaltown : "";
}

export function formatPostcode(postcode) {
  if (!postcode) return "";
  return postcode.substring(Math.max(postcode.length - 5, 0));
}

export function resolveCounty(postcode) {
  return getCounty(postcode);
}
