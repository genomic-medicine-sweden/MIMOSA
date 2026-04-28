export function buildDetailRenderOptions(colorByMap, colorByPalette) {
  if (!colorByMap || !colorByPalette) return {};

  return {
    "node-styler": (element, node) => {
      const sampleID = node.data?.name;
      if (!sampleID) return;

      const value = colorByMap[sampleID];
      if (!value) return;

      const color = colorByPalette[value] ?? "#333";

      element
        .selectAll("text")
        .style("fill", color)
        .style("font-weight", "600");
    },
  };
}
