export function buildCollapsedNewick(newick, clusterMap) {
  if (!newick || !clusterMap || Object.keys(clusterMap).length === 0)
    return newick;

  const SENTINEL = "__REMOVE_LEAF__";
  const seenClusters = new Set();

  let result = newick.replace(
    /([^(),;:\s][^(),;:]*?)(\s*:[^(),;]*)?(?=[,);])/g,
    (match, label, branch) => {
      const trimmed = label.trim();
      const clusterID = clusterMap[trimmed];
      if (!clusterID) return match;

      const isSingleton = clusterID.toLowerCase().includes("singleton");
      if (isSingleton) return match;

      if (!seenClusters.has(clusterID)) {
        seenClusters.add(clusterID);
        return `${clusterID}${branch || ""}`;
      }
      return SENTINEL;
    },
  );

  result = result.replace(new RegExp(`,\\s*${SENTINEL}`, "g"), "");
  result = result.replace(new RegExp(`${SENTINEL}\\s*,`, "g"), "");
  result = result.replace(new RegExp(SENTINEL, "g"), "");
  for (let i = 0; i < 5; i++) {
    result = result.replace(/\(\s*,/g, "(");
    result = result.replace(/,\s*\)/g, ")");
    result = result.replace(/\(\s*\)/g, "");
    result = result.replace(/,,+/g, ",");
  }

  return result;
}
