import colorPalette from "./ColorPalette";

const DEFAULT_COLOR = "#D3D3D3";
let STProfileCountMap = new Map();

const hashSTToColorIndex = (ST, analysis_profile) => {
  let hash = 0;
  const combinedKey = `${ST}-${analysis_profile}`;
  for (let i = 0; i < combinedKey.length; i++) {
    hash = combinedKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colorPalette.length;
};

export const countOccurrences = (data) => {
  STProfileCountMap.clear();
  data.forEach((item) => {
    const { ST, analysis_profile } = item.properties;

    if (ST && analysis_profile) {
      const key = `${ST}-${analysis_profile}`;
      let count = STProfileCountMap.get(key) || 0;
      STProfileCountMap.set(key, count + 1);
    }
  });
};

export const getColor = (ST, analysis_profile) => {
  const key = `${ST}-${analysis_profile}`;
  const count = STProfileCountMap.get(key) || 0;

  if (count >= 2) {
    const colorIndex = hashSTToColorIndex(ST.toString());
    return colorPalette[colorIndex];
  }

  return DEFAULT_COLOR;
};

