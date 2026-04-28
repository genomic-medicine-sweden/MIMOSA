import { getColor, SINGLETON_COLOR, getStep } from "@/utils/ColorAssignment";
import colorPalette from "@/utils/ColorPalette";
import { getCounty, getPostalTown } from "@/utils/locationUtils";

const SKIP_PROPERTIES = new Set([
  "QC_Status",
  "Pipeline_Version",
  "Pipeline_Date",
  "analysis_profile",
  "ID",
  "alleles",
]);

const isGrayValue = (v) =>
  !v ||
  v === "Unknown" ||
  v === "Singleton" ||
  String(v).toLowerCase().includes("singleton");

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

  const hasAnyPostcode = profileData.some((item) =>
    item.properties?.PostCode?.trim(),
  );
  if (hasAnyPostcode) {
    const hasCounty = profileData.some(
      (item) => !!getCounty(item.properties?.PostCode),
    );
    const hasPostalTown = profileData.some(
      (item) => !!getPostalTown(item.properties?.PostCode),
    );
    if (hasCounty) keys.push("County");
    if (hasPostalTown) keys.push("Postal Town");
  }

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

      if (colorByKey === "County") {
        result[id] = getCounty(props.PostCode) || "Unknown";
        return;
      }

      if (colorByKey === "Postal Town") {
        result[id] = getPostalTown(props.PostCode) || "Unknown";
        return;
      }

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
  const palette = {};
  const uniqueValues = [...new Set(Object.values(colorByMap))];

  if (colorBy === "Cluster") {
    uniqueValues.forEach((value) => {
      palette[value] = getColor(value, analysisProfile, true);
    });
    return palette;
  }

  uniqueValues.forEach((v) => {
    if (isGrayValue(v)) palette[v] = SINGLETON_COLOR;
  });

  const colorValues = uniqueValues.filter((v) => !isGrayValue(v)).sort();
  if (colorValues.length === 0) return palette;

  const step = getStep(colorValues.length);
  colorValues.forEach((value, i) => {
    palette[value] = colorPalette[(i * step) % colorPalette.length];
  });

  return palette;
}
