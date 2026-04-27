import {
  getColor,
  SINGLETON_COLOR,
  countOccurrences,
} from "@/utils/ColorAssignment";

export function buildClusterCounts(clusterMap) {
  const counts = {};
  Object.values(clusterMap).forEach((clusterID) => {
    if (clusterID.toLowerCase().includes("singleton")) return;
    counts[clusterID] = (counts[clusterID] || 0) + 1;
  });
  return counts;
}

export function buildClusterSampleMap(clusterMap) {
  const samplesByCluster = {};
  Object.entries(clusterMap).forEach(([sampleID, clusterID]) => {
    if (clusterID.toLowerCase().includes("singleton")) return;
    if (!samplesByCluster[clusterID]) samplesByCluster[clusterID] = [];
    samplesByCluster[clusterID].push(sampleID);
  });
  return samplesByCluster;
}

export function seedClusterColors(clusterCounts, analysisProfile) {
  const synthetic = Object.entries(clusterCounts).flatMap(
    ([clusterID, count]) =>
      Array.from({ length: count }, (_, i) => ({
        properties: {
          ID: `__seed_${clusterID}_${i}`,
          Cluster_ID: clusterID,
          analysis_profile: analysisProfile,
        },
      })),
  );
  countOccurrences(synthetic);
}

export function buildClusterPalette(clusterCounts, analysisProfile) {
  const palette = {};
  Object.keys(clusterCounts).forEach((clusterID) => {
    palette[clusterID] = getColor(clusterID, analysisProfile, true);
  });
  return palette;
}

export function buildClusterRenderOptions(
  clusterCounts,
  analysisProfile,
  sampleDisplay,
  clusterSampleMap = {},
  onClusterClick = null,
) {
  return {
    "draw-size-bubbles": true,
    "bubble-styler": (node) => {
      const label = node.data?.name;
      if (!label) return 0;
      if (!(label in clusterCounts)) return 5;
      const count = clusterCounts[label] || 1;
      return Math.min(20, 6 + Math.sqrt(count) * 1.5);
    },
    "node-styler": (element, node) => {
      const label = node.data?.name;
      if (!label) {
        element.selectAll("circle").style("display", "none");
        return;
      }

      const isRealCluster = label in clusterCounts;
      const count = clusterCounts[label] || 1;
      const color = isRealCluster
        ? getColor(label, analysisProfile, true)
        : SINGLETON_COLOR;

      element
        .selectAll("circle")
        .style("fill", color)
        .style("stroke", "#555")
        .style("stroke-width", "1px");

      let displayLabel;
      if (!isRealCluster) {
        displayLabel = label;
      } else if (sampleDisplay === "none") {
        displayLabel = "";
      } else {
        displayLabel = `Cluster ${label} (${count} sample${count !== 1 ? "s" : ""})`;
      }
      element.selectAll("text").text(displayLabel);

      if (isRealCluster && onClusterClick) {
        element.style("cursor", "pointer").on("click", function (event) {
          event.stopPropagation();
          onClusterClick({
            clusterID: label,
            samples: clusterSampleMap[label] ?? [],
          });
        });
      }
    },
  };
}
