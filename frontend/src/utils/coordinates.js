let postcodeCoordinates = {};
let hospitalCoordinates = {};
let postcodePrefix = "";
let postcodeLength = 0;

export function initCoordinates(postcode, hospital, prefix, length) {
  postcodeCoordinates = postcode ?? {};
  hospitalCoordinates = hospital ?? {};
  postcodePrefix = prefix ?? "";
  postcodeLength = length ?? 0;
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
