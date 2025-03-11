export function generateOutbreakMessage(countyCounts) {
  const Cluster_IDOccurrences = {};

  Object.entries(countyCounts).forEach(([countyName, countyData]) => {
    Object.entries(countyData.Cluster_ID || {}).forEach(([Cluster_ID, count]) => {
      if (Cluster_ID !== "Unknown") { // Exclude "Unknown" Cluster_ID
        Cluster_IDOccurrences[Cluster_ID] = (Cluster_IDOccurrences[Cluster_ID] || 0) + count;
      }
    });
  });

  const outbreakCluster_IDs = Object.entries(Cluster_IDOccurrences).filter(
    ([Cluster_ID, count]) => count >= 2
  );

  if (outbreakCluster_IDs.length > 0) {
    return `<div style="color: black; padding: 4px; border-radius: 2px;">
                <h2>Outbreak Alert!</h2>
                ${outbreakCluster_IDs
                  .map(
                    ([Cluster_ID, count]) =>
                      `<p>There are multiple occurrences of ${Cluster_ID} with a total of ${count} cases.</p>`
                  )
                  .join("")}
              </div>`;
  }

  return "";
}

