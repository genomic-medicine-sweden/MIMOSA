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
        let clustering = await clusteringRes.json();
        if (!Array.isArray(clustering)) clustering = [clustering];

        // Choose most recent mapping
        const selected = clustering.reduce((a, b) =>
          new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
        );

        const mapping = {};
        if (selected?.results) {
          selected.results.forEach((item) => {
            mapping[item.ID] = {
              clusterID: item.Cluster_ID || "Unknown",
              partition: item.Partition || "Unknown",
            };
          });
        }

        const enriched = features.map((item) => {
          const id = item.properties.ID;
          const clusterInfo = mapping[id] || {
            clusterID: item.properties.Cluster_ID || "Unknown",
            partition: item.properties.Partition || "Unknown",
          };

          item.properties.Cluster_ID = clusterInfo.clusterID;
          item.properties.Partition = clusterInfo.partition;

          return {
            ...item,
            clusterID: clusterInfo.clusterID,
            partition: clusterInfo.partition,
            color: getColor(
              clusterInfo.clusterID,
              item.properties.analysis_profile,
            ),
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
