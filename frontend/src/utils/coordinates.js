let postcodeCoordinates = {};
let hospitalCoordinates = {};
let postcodePrefix = "";
let postcodeLength = 0;
let boundariesData = null;
let regionNameKey = "name";

export function initCoordinates(
  postcode,
  hospital,
  prefix,
  length,
  boundaries,
  nameKey,
) {
  postcodeCoordinates = postcode ?? {};
  hospitalCoordinates = hospital ?? {};
  postcodePrefix = prefix ?? "";
  postcodeLength = length ?? 0;
  boundariesData = boundaries ?? null;
  regionNameKey = nameKey ?? "name";
}

export function getBoundariesData() {
  return boundariesData;
}
export function getRegionNameKey() {
  return regionNameKey;
}

export function getPostcodeCoordinates() {
  return postcodeCoordinates;
}

export function getHospitalCoordinates() {
  return hospitalCoordinates;
}

export function getPostcodePrefix() {
  return postcodePrefix;
}

export function getPostcodeLength() {
  return postcodeLength;
}
