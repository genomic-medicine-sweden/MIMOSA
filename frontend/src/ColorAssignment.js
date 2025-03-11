import colorPalette from "./ColorPalette";

const DEFAULT_COLOR = "#FFFFFF";
const SINGLETON_COLOR = "#D3D3D3";
let Cluster_IDProfileCountMap = new Map();

const hashCluster_IDToColorIndex = (Cluster_ID, analysis_profile) => {
  let hash = 0;
  const combinedKey = `${Cluster_ID}-${analysis_profile}`;
  for (let i = 0; i < combinedKey.length; i++) {
    hash = combinedKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colorPalette.length;
};

export const countOccurrences = (data) => {
  Cluster_IDProfileCountMap.clear();
  data.forEach((item) => {
    const { Cluster_ID, analysis_profile } = item.properties;
    if (Cluster_ID && analysis_profile) {
      const key = `${Cluster_ID}-${analysis_profile}`;
      let count = Cluster_IDProfileCountMap.get(key) || 0;
      Cluster_IDProfileCountMap.set(key, count + 1);
    }
  });
};

export const getColor = (Cluster_ID, analysis_profile, force = false) => {
  if (Cluster_ID === "Unknown") {
    return DEFAULT_COLOR;
  }
  
  if (Cluster_ID.toLowerCase().includes("singleton")) {
    return SINGLETON_COLOR;
  }
  
  const key = `${Cluster_ID}-${analysis_profile}`;
  const count = Cluster_IDProfileCountMap.get(key) || 0;
  
  if (force || count >= 2) {
    const colorIndex = hashCluster_IDToColorIndex(Cluster_ID, analysis_profile);
    return colorPalette[colorIndex];
  }
  
  return DEFAULT_COLOR;
};

