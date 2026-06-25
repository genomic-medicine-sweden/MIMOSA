"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function usePendingSamples() {
  const [pendingSamples, setPendingSamples] = useState([]);
  const [loading, setLoading] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const fetchPendingSamples = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBase}/api/pending-samples`);
      if (res?.ok) {
        const data = await res.json();
        const now = Date.now();
        setPendingSamples(
          data.filter((s) => new Date(s.expiresAt).getTime() > now),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingSamples();
    const interval = setInterval(fetchPendingSamples, 60_000);
    return () => clearInterval(interval);
  }, [fetchPendingSamples]);

  const createPendingSample = useCallback(
    async (dto) => {
      const res = await apiFetch(`${apiBase}/api/pending-samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });
      if (res?.ok) await fetchPendingSamples();
      return res;
    },
    [fetchPendingSamples],
  );

  const updatePendingSample = useCallback(
    async (id, dto) => {
      const res = await apiFetch(`${apiBase}/api/pending-samples/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });
      if (res?.ok) await fetchPendingSamples();
      return res;
    },
    [fetchPendingSamples],
  );

  const deletePendingSample = useCallback(
    async (id) => {
      const res = await apiFetch(`${apiBase}/api/pending-samples/${id}`, {
        method: "DELETE",
      });
      if (res?.ok) await fetchPendingSamples();
      return res;
    },
    [fetchPendingSamples],
  );

  return {
    pendingSamples,
    loading,
    createPendingSample,
    updatePendingSample,
    deletePendingSample,
    refresh: fetchPendingSamples,
  };
}
