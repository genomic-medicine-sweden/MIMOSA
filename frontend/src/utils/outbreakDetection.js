import postcodeCoordinates from "@/assets/postcode-coordinates";
import HospitalCoordinates from "@/assets/hospital-coordinates";
import { generateOutbreakMessage } from "@/utils/OutBreakMessage";

export function computeOutbreaks(filteredData, hospitalView) {
  if (!filteredData || filteredData.length === 0) return [];

  const countyCounts = {};

  filteredData.forEach((item) => {
    const { PostCode, Hospital, Cluster_ID } = item.properties;

    let countyName = null;

    if (hospitalView && HospitalCoordinates[Hospital]) {
      const postCode = HospitalCoordinates[Hospital].PostCode;
      countyName = postcodeCoordinates[postCode]?.County || null;
    } else if (!hospitalView && postcodeCoordinates[PostCode]) {
      countyName = postcodeCoordinates[PostCode]?.County || null;
    }

    if (!countyName || countyName === "Unknown") return;

    if (!countyCounts[countyName]) {
      countyCounts[countyName] = { total: 0, Cluster_ID: {} };
    }

    countyCounts[countyName].total++;

    countyCounts[countyName].Cluster_ID[Cluster_ID] =
      (countyCounts[countyName].Cluster_ID[Cluster_ID] || 0) + 1;
  });

  return generateOutbreakMessage(countyCounts);
}
