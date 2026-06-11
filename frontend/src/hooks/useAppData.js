"use client";

import { useEffect, useState, useCallback } from "react";
import { getColor, countOccurrences } from "@/utils/ColorAssignment";
import { apiFetch } from "@/utils/apiFetch";

export default function useAppData() {
  const [data, setData] = useState([]);
  const [similarity, setSimilarity] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [logs, setLogs] = useState([]);
  const [clusters, setClusters] = useState({});
  const [clusteringByProfile, setClusteringByProfile] = useState({});
  const [hasNewData, setHasNewData] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;

      const [featuresRes, similarityRes, logsRes, clusteringRes] =
        await Promise.all([
          apiFetch(`${apiBase}/api/features`),
          apiFetch(`${apiBase}/api/similarity`),
          apiFetch(`${apiBase}/api/logs`),
          apiFetch(`${apiBase}/api/clustering`),
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

      setClusteringByProfile(clusteringByProfile);

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

      setHasNewData(false);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, dateRange]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    const es = new EventSource(`${apiBase}/api/features/events`, {
      withCredentials: true,
    });

    es.onmessage = () => {
      setHasNewData(true);
      setDataVersion((v) => v + 1);
      fetchData();
    };

    es.onerror = (err) => {
      console.warn("[SSE] Connection error, will auto-reconnect:", err);
    };

    return () => es.close();
  }, [fetchData]);

  return {
    data,
    similarity,
    logs,
    clusters,
    clusteringByProfile,
    dateRange,
    setDateRange,
    hasNewData,
    dataVersion,
  };
}
