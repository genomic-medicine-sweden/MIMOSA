"use client";

import { useEffect, useState } from "react";
import { getColor, countOccurrences } from "@/utils/ColorAssignment";

export default function useAppData() {
  const [data, setData] = useState([]);
  const [similarity, setSimilarity] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [logs, setLogs] = useState([]);
  const [clusters, setClusters] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL;

        const [featuresRes, similarityRes, logsRes, clusteringRes] =
          await Promise.all([
            fetch(`${apiBase}/api/features`, { credentials: "include" }),
            fetch(`${apiBase}/api/similarity`, { credentials: "include" }),
            fetch(`${apiBase}/api/logs`, { credentials: "include" }),
            fetch(`${apiBase}/api/clustering`, { credentials: "include" }),
          ]);

        const features = await featuresRes.json();
        const similarityData = await similarityRes.json();
        const logsData = await logsRes.json();
        const clusteringArray = await clusteringRes.json();

        const clusteringByProfile = {};

        if (Array.isArray(clusteringArray)) {
          clusteringArray.forEach((run) => {
            const profile = run.analysis_profile;
            if (!profile) return;

            const existing = clusteringByProfile[profile];
            if (
              !existing ||
              new Date(run.createdAt) > new Date(existing.createdAt)
            ) {
              clusteringByProfile[profile] = run;
            }
          });
        }

        const clusterMapByProfile = {};

        Object.entries(clusteringByProfile).forEach(([profile, run]) => {
          const mapping = {};
          if (Array.isArray(run.results)) {
            run.results.forEach((item) => {
              mapping[item.ID] = {
                clusterID: item.Cluster_ID ?? "Unknown",
                partition: item.Partition ?? "Unknown",
              };
            });
          }
          clusterMapByProfile[profile] = mapping;
        });

        const enriched = features.map((item) => {
          const id = item.properties.ID;
          const profile = item.properties.analysis_profile;

          const profileMapping = clusterMapByProfile[profile] || {};
          const clusterInfo = profileMapping[id] || {
            clusterID: "Unknown",
            partition: "Unknown",
          };

          item.properties.Cluster_ID = clusterInfo.clusterID;
          item.properties.Partition = clusterInfo.partition;

          return {
            ...item,
            clusterID: clusterInfo.clusterID,
            partition: clusterInfo.partition,
            color: getColor(clusterInfo.clusterID, profile),
          };
        });

        countOccurrences(enriched);
        setData(enriched);
        setSimilarity(similarityData);
        setLogs(logsData);

        const clusterGroups = {};
        enriched.forEach((item) => {
          const id = item.properties.ID;
          const clusterId = item.properties.Cluster_ID;
          if (!clusterGroups[clusterId]) clusterGroups[clusterId] = [];
          clusterGroups[clusterId].push(id);
        });
        setClusters(clusterGroups);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    fetchData();
  }, [dateRange]);

  return { data, similarity, logs, clusters, dateRange, setDateRange };
}
