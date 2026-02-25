import counties from '../assets/counties.json';

export type County = (typeof counties)[number];

function normalise(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

const COUNTY_INDEX = new Map<string, County>(
  (counties as County[]).map((c) => [normalise(c), c]),
);

export function parseCounty(input: unknown): County | undefined {
  if (typeof input !== 'string') return undefined;
  const key = normalise(input);
  if (!key) return undefined;
  return COUNTY_INDEX.get(key);
}

export { counties };
