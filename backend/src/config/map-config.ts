const ACTIVE_MAP = 'sweden' as const;

type MapConfig = {
  activeMap: string;
  bounds: [[number, number], [number, number]];
  center: [number, number];
  regionNameKey: string;
  postcodePrefix: string;
  postcodeLength: number;
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
  },
};

if (!(ACTIVE_MAP in configs)) {
  throw new Error(
    `[map-config] ACTIVE_MAP "${ACTIVE_MAP}" has no entry in configs. ` +
      `Available: ${Object.keys(configs).join(', ')}`,
  );
}

export default configs[ACTIVE_MAP];
