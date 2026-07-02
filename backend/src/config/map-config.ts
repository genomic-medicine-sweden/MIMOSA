const ACTIVE_MAP = process.env.ACTIVE_MAP ?? 'sweden';

type MapConfig = {
  activeMap: string;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  regionNameKey: string;
  postcodePrefix: string;
  postcodeLength: number;
  defaultCounties?: string[];
  boundariesFile?: string;
  boundariesApi?: {
    countryCode: string;
    level: string;
  };
};

const configs: Record<string, MapConfig> = {
  sweden: {
    activeMap: 'sweden',
    bounds: [
      [54.0, 10.0],
      [70.0, 25.0],
    ],
    center: [63.0, 15.0],
    regionNameKey: 'name',
    postcodePrefix: 'SE-',
    postcodeLength: 5,
    boundariesFile: 'sweden-with-regions.json',
  },
  uk: {
    activeMap: 'uk',
    bounds: [
      [49.0, -8.0],
      [61.0, 2.0],
    ],
    center: [54.0, -2.0],
    regionNameKey: 'shapeName',
    postcodePrefix: '',
    postcodeLength: 7,
    boundariesFile: 'uk-with-regions.json',
    boundariesApi: { countryCode: 'GBR', level: 'ADM1' },
  },
  norway: {
    activeMap: 'norway',
    bounds: [
      [57.0, 4.0],
      [71.5, 31.5],
    ],
    center: [65.0, 15.0],
    regionNameKey: 'shapeName',
    postcodePrefix: '',
    postcodeLength: 4,
    boundariesApi: { countryCode: 'NOR', level: 'ADM1' },
  },
};

function resolveConfig(mapKey: string): MapConfig {
  const defaultCounties = process.env.COUNTY
    ? process.env.COUNTY.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const base =
    mapKey.toLowerCase() in configs
      ? configs[mapKey.toLowerCase()]
      : {
          activeMap: mapKey,
          bounds: [
            [-90, -180],
            [90, 180],
          ] as [[number, number], [number, number]],
          center: [20, 0] as [number, number],
          regionNameKey: 'shapeName',
          postcodePrefix: '',
          postcodeLength: 7,
          boundariesApi: { countryCode: mapKey.toUpperCase(), level: 'ADM1' },
        };

  return defaultCounties ? { ...base, defaultCounties } : base;
}

const activeConfig = resolveConfig(ACTIVE_MAP);

export default activeConfig;
