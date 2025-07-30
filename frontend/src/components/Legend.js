import { getColor } from "@/utils/ColorAssignment";

const generateLegendItems = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const uniqueCluster_IDProfiles = new Set(
    data.map((item) => `${item.properties.Cluster_ID}-${item.properties.analysis_profile}`)
  );

  const legendMap = new Map();

  uniqueCluster_IDProfiles.forEach((profile) => {
    let [Cluster_ID, analysis_profile] = profile.split("-");
    let displayLabel = Cluster_ID;
    
    if (Cluster_ID.toLowerCase().includes("singleton")) {
       displayLabel = "Singleton"; 
       Cluster_ID = "Singleton"; 
    }

    const color = getColor(Cluster_ID, analysis_profile);
    
    if (!legendMap.has(displayLabel)) {
      legendMap.set(displayLabel, { value: displayLabel, label: displayLabel, color: color });
    }
  });

  return Array.from(legendMap.values());
};

export default generateLegendItems;
