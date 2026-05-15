import {
  getPostcodeCoordinates,
  getHospitalCoordinates,
  getPostcodePrefix,
  getPostcodeLength,
} from "@/utils/coordinates";

export const validatePostCode = (value) => {
  if (!value?.trim()) return "";

  const prefix = getPostcodePrefix();
  const length = getPostcodeLength();
  const stripped = value.startsWith(prefix)
    ? value.slice(prefix.length)
    : value.trim();

  if (stripped.length !== length) {
    return `Postcode must be ${length} characters.`;
  }

  const prefixed = `${prefix}${stripped}`;
  if (
    !Object.prototype.hasOwnProperty.call(getPostcodeCoordinates(), prefixed)
  ) {
    return `Postcode ${prefixed} is not supported.`;
  }

  return "";
};

export const validateDate = (value) => {
  if (!value?.trim()) return "";

  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(value)) {
    return "Invalid date format (YYYY-MM-DD).";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return "Invalid calendar date.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date > today) {
    return "Date cannot be in the future.";
  }

  return "";
};

const STOP_WORDS = new Set([
  "sjukhus",
  "lasarett",
  "universitetssjukhus",
  "universitet",
]);

const normalise = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

const tokenize = (value) =>
  normalise(value)
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t));

const tokenSimilarity = (aTokens, bTokens) => {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

const findClosestHospital = (value) => {
  const canonicalHospitals = Object.keys(getHospitalCoordinates());
  const inputTokens = tokenize(value);
  if (inputTokens.length === 0) return null;

  let best = null;
  let bestScore = 0;

  for (const name of canonicalHospitals) {
    const score = tokenSimilarity(inputTokens, tokenize(name));
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }

  return bestScore >= 0.5 ? best : null;
};

export const validateHospital = (value) => {
  if (!value?.trim()) return "";

  const canonicalHospitals = Object.keys(getHospitalCoordinates());
  const normalisedHospitalMap = canonicalHospitals.reduce((acc, name) => {
    acc[normalise(name)] = name;
    return acc;
  }, {});

  const norm = normalise(value);

  if (normalisedHospitalMap[norm]) {
    return "";
  }

  const suggestion = findClosestHospital(value);

  if (suggestion) {
    return {
      error: `Hospital "${value}" is not supported.`,
      suggestion,
    };
  }

  return {
    error: `Hospital "${value}" is not supported.`,
  };
};

export const fieldValidators = {
  Date: validateDate,
  PostCode: validatePostCode,
  Hospital: validateHospital,
};
