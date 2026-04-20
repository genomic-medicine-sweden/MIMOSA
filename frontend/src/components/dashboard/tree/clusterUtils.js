import { getColor, countOccurrences } from "@/utils/ColorAssignment";

export function buildClusterCounts(clusterMap) {
  const counts = {};
  Object.values(clusterMap).forEach((clusterID) => {
    if (clusterID.toLowerCase().includes("singleton")) return;
    counts[clusterID] = (counts[clusterID] || 0) + 1;
  });
  return counts;
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

export function buildClusterRenderOptions(
  clusterCounts,
  analysisProfile,
  showSampleCount,
) {
  return {
    "draw-size-bubbles": true,

    "bubble-styler": (node) => {
      const label = node.data?.name;
      if (!label) return 0;
      if (!(label in clusterCounts)) return 5;
      const count = clusterCounts[label] || 1;
      return 6 + Math.sqrt(count) * 4;
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
        : "#D3D3D3";

      element
        .selectAll("circle")
        .style("fill", color)
        .style("stroke", "#555")
        .style("stroke-width", "1px");

      const displayLabel = isRealCluster
        ? showSampleCount
          ? `Cluster ${label} (${count} sample${count !== 1 ? "s" : ""})`
          : `Cluster ${label}`
        : label;

      element.selectAll("text").text(displayLabel);
    },
  };
}
