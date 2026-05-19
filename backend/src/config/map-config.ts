const ACTIVE_MAP = 'sweden' as const;

type MapConfig = {
  activeMap: string;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  regionNameKey: string;
  postcodePrefix: string;
  postcodeLength: number;
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

if (!(ACTIVE_MAP in configs)) {
  throw new Error(
    `[map-config] ACTIVE_MAP "${ACTIVE_MAP}" has no entry in configs. ` +
      `Available: ${Object.keys(configs).join(', ')}`,
  );
}

const activeConfig = configs[ACTIVE_MAP];
if (!activeConfig.boundariesFile && !activeConfig.boundariesApi) {
  throw new Error(
    `[map-config] "${ACTIVE_MAP}" has no boundaries source configured. ` +
      `Set boundariesFile and/or boundariesApi in the config.`,
  );
}

export default activeConfig;
