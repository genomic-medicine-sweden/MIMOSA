import { getColor } from "@/utils/ColorAssignment";
import colorPalette from "@/utils/ColorPalette";

const SKIP_PROPERTIES = new Set([
  "QC_Status",
  "Pipeline_Version",
  "Pipeline_Date",
  "analysis_profile",
  "ID",
  "alleles",
]);

export function getColorableProperties(data, analysisProfile) {
  const profileData = data.filter(
    (item) => item.properties?.analysis_profile === analysisProfile,
  );
  if (profileData.length === 0) return ["Cluster"];

  const candidates = new Map();
  profileData.forEach((item) => {
    const props = item.properties;
    if (!props) return;
    Object.entries(props).forEach(([key, value]) => {
      if (SKIP_PROPERTIES.has(key)) return;
      if (key === "typing") {
        if (value && typeof value === "object") {
          Object.entries(value).forEach(([subKey, subVal]) => {
            if (subKey === "alleles") return;
            if (subVal && String(subVal).trim() !== "") {
              candidates.set(subKey, (candidates.get(subKey) || 0) + 1);
            }
          });
        }
        return;
      }
      if (value && String(value).trim() !== "") {
        candidates.set(key, (candidates.get(key) || 0) + 1);
      }
    });
  });

  const keys = [...candidates.entries()]
    .filter(([, count]) => count > 0)
    .map(([key]) => key)
    .filter((key) => key !== "Cluster_ID" && key !== "Partition");

  return ["Cluster", ...keys];
}

export function buildColorByMap(
  data,
  analysisProfile,
  colorByKey,
  clusterMap = {},
) {
  const result = {};

  if (colorByKey === "Cluster") {
    Object.entries(clusterMap).forEach(([sampleID, clusterID]) => {
      const isSingleton = String(clusterID).toLowerCase().includes("singleton");
      result[sampleID] = isSingleton ? "Singleton" : String(clusterID);
    });
    return result;
  }

  data
    .filter((item) => item.properties?.analysis_profile === analysisProfile)
    .forEach((item) => {
      const props = item.properties;
      const id = props?.ID;
      if (!id) return;
      if (props[colorByKey] !== undefined) {
        result[id] = String(props[colorByKey] || "Unknown");
      } else if (props.typing?.[colorByKey] !== undefined) {
        result[id] = String(props.typing[colorByKey] || "Unknown");
      } else {
        result[id] = "Unknown";
      }
    });

  return result;
}

export function buildColorByPalette(colorByMap, colorBy, analysisProfile) {
  const GRAY = "#D3D3D3";
  const isGray = (v) =>
    !v ||
    v === "Unknown" ||
    v === "Singleton" ||
    String(v).toLowerCase().includes("singleton");

  const palette = {};
  const uniqueValues = [...new Set(Object.values(colorByMap))];

  if (colorBy === "Cluster") {
    uniqueValues.forEach((value) => {
      palette[value] = isGray(value)
        ? GRAY
        : getColor(value, analysisProfile, true);
    });
    return palette;
  }

  uniqueValues.forEach((v) => {
    if (isGray(v)) palette[v] = GRAY;
  });

  const colorValues = uniqueValues.filter((v) => !isGray(v)).sort();
  if (colorValues.length === 0) return palette;

  const n = colorPalette.length;

  const targetStep = Math.max(2, Math.floor(n / 3));
  let step = targetStep;
  while (gcd(step, n) !== 1) step++;

  colorValues.forEach((value, i) => {
    const index = (i * step) % n;
    palette[value] = colorPalette[index];
  });

  return palette;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}
