export function generateOutbreakMessage(countyCounts) {
  const clusterMap = {};

  Object.entries(countyCounts).forEach(([countyName, countyData]) => {
    Object.entries(countyData.Cluster_ID || {}).forEach(
      ([Cluster_ID, count]) => {
        if (Cluster_ID !== "Unknown" && count > 0) {
          if (!clusterMap[Cluster_ID]) {
            clusterMap[Cluster_ID] = {
              total: 0,
              counties: [],
            };
          }

          clusterMap[Cluster_ID].total += count;
          clusterMap[Cluster_ID].counties.push({
            county: countyName,
            count,
          });
        }
      },
    );
  });

  return Object.entries(clusterMap)
    .filter(([_, data]) => data.total >= 2)
    .map(([Cluster_ID, data]) => ({
      clusterId: Cluster_ID,
      total: data.total,
      counties: data.counties,
    }));
}
