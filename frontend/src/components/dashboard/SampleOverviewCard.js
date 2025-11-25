"use client";

import { useEffect, useState } from "react";
import useAppData from "@/hooks/useAppData";
import postcodeData from "@/assets/postcode-coordinates";

export default function SampleOverviewCard() {
  const { data: enrichedSamples } = useAppData();
  const [homeCounty, setHomeCounty] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setHomeCounty(parsed.homeCounty);
      } catch (err) {
        console.warn("Could not parse user from localStorage:", err);
      }
    }
  }, []);

  const getCounty = (postcode) => {
    const entry = postcodeData[postcode];
    return entry && entry.County !== "0" ? entry.County : "";
  };

  const validSamples = enrichedSamples.filter((s) => s.properties?.ID);

  const requiredFields = ["Hospital", "PostCode", "Date"];

  const totalSamplesOverall = validSamples.length;
  const totalSamplesCounty = validSamples.filter(
    (s) => getCounty(s.properties.PostCode) === homeCounty,
  ).length;

  const incompleteSamplesOverall = validSamples.filter((s) =>
    requiredFields.some((field) => !s.properties[field]?.trim()),
  ).length;

  const incompleteSamplesCounty = validSamples.filter(
    (s) =>
      getCounty(s.properties.PostCode) === homeCounty &&
      requiredFields.some((field) => !s.properties[field]?.trim()),
  ).length;

  const clusterStats = {};

  validSamples.forEach((sample) => {
    let clusterID = sample.clusterID || "Unknown";
    if (clusterID.toLowerCase().startsWith("singleton")) {
      clusterID = "Singleton";
    }

    if (!clusterStats[clusterID]) {
      clusterStats[clusterID] = { total: 0, county: 0 };
    }

    clusterStats[clusterID].total++;

    const county = getCounty(sample.properties.PostCode);
    if (county === homeCounty) {
      clusterStats[clusterID].county++;
    }
  });

  const clusterEntries = Object.entries(clusterStats).sort(([a], [b]) => {
    if (a === "Singleton") return 1;
    if (b === "Singleton") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="rounded-xl p-4 bg-white shadow-md min-h-[200px] text-sm text-gray-800">
      <h2 className="text-lg font-semibold mb-2">County Samples (National)</h2>

      <table className="table-auto mb-4">
        <tbody>
          <tr>
            <td className="py-1 pr-3 whitespace-nowrap">Total samples</td>
            <td className="py-1 font-medium text-right pl-3">
              {totalSamplesCounty} ({totalSamplesOverall})
            </td>
          </tr>
          <tr>
            <td className="py-1 pr-3 whitespace-nowrap">Incomplete samples</td>
            <td className="py-1 font-medium text-right pl-3">
              {incompleteSamplesCounty} ({incompleteSamplesOverall})
            </td>
          </tr>
        </tbody>
      </table>

      <h3 className="text-sm font-semibold mb-2">Cluster Summary</h3>

      <table className="table-auto">
        <tbody>
          {clusterEntries.map(([clusterID, stats]) => (
            <tr key={clusterID}>
              <td className="py-1 pr-3 whitespace-nowrap">{clusterID}</td>
              <td className="py-1 font-medium text-right pl-3">
                {stats.county} ({stats.total})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
