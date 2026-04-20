"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function useClustering(analysisProfile) {
  const [clusterMap, setClusterMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!analysisProfile) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    setLoading(true);
    apiFetch(`${apiBase}/api/clustering?analysis_profile=${analysisProfile}`)
      .then((res) => res.json())
      .then((data) => {
        const map = {};
        const results = Array.isArray(data) ? data[0]?.results : data?.results;
        if (Array.isArray(results)) {
          results.forEach((item) => {
            map[item.ID] = String(item.Cluster_ID);
          });
        }
        setClusterMap(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [analysisProfile]);

  return { clusterMap, loading };
}
