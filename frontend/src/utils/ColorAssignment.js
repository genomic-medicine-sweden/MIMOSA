import colorPalette from "./ColorPalette";

const DEFAULT_COLOR = "#FFFFFF";
export const SINGLETON_COLOR = "#D3D3D3";

let Cluster_IDProfileColorMap = new Map();

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

export function getStep(n) {
  const target = Math.max(2, Math.floor(colorPalette.length / 3));
  let step = target;
  while (gcd(step, colorPalette.length) !== 1) step++;
  return step;
}

export const countOccurrences = (data) => {
  Cluster_IDProfileColorMap.clear();
  const profileClusters = new Map();

  data.forEach((item) => {
    if (!item?.properties) return;
    const { Cluster_ID, analysis_profile } = item.properties;
    if (!Cluster_ID || !analysis_profile) return;

    const isSpecial =
      String(Cluster_ID) === "Unknown" ||
      String(Cluster_ID).toLowerCase().includes("singleton");
    if (isSpecial) return;

    if (!profileClusters.has(analysis_profile)) {
      profileClusters.set(analysis_profile, new Set());
    }
    profileClusters.get(analysis_profile).add(String(Cluster_ID));
  });

  profileClusters.forEach((clusterSet, profile) => {
    const clusters = [...clusterSet].sort();
    const step = getStep(clusters.length);
    clusters.forEach((clusterID, i) => {
      const index = (i * step) % colorPalette.length;
      const key = `${clusterID}-${profile}`;
      Cluster_IDProfileColorMap.set(key, colorPalette[index]);
    });
  });
};

export const getColor = (Cluster_ID, analysis_profile, force = false) => {
  if (!Cluster_ID || Cluster_ID === "Unknown") return DEFAULT_COLOR;
  if (String(Cluster_ID).toLowerCase().includes("singleton")) {
    return SINGLETON_COLOR;
  }

  const key = `${Cluster_ID}-${analysis_profile}`;
  const assigned = Cluster_IDProfileColorMap.get(key);
  if (assigned) return assigned;

  if (force) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colorPalette[Math.abs(hash) % colorPalette.length];
  }

  return DEFAULT_COLOR;
};
