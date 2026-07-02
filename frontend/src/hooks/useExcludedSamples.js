"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function useExcludedSamples() {
  const [excludedSamples, setExcludedSamples] = useState([]);
  const [loading, setLoading] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const fetchExcludedSamples = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBase}/api/excluded-samples`);
      if (res?.ok) {
        const data = await res.json();
        setExcludedSamples(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExcludedSamples();
  }, [fetchExcludedSamples]);

  const createExcludedSample = useCallback(
    async (dto) => {
      const res = await apiFetch(`${apiBase}/api/excluded-samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });
      if (res?.ok) await fetchExcludedSamples();
      return res;
    },
    [fetchExcludedSamples],
  );

  const deleteExcludedSample = useCallback(
    async (id) => {
      const res = await apiFetch(`${apiBase}/api/excluded-samples/${id}`, {
        method: "DELETE",
      });
      if (res?.ok) await fetchExcludedSamples();
      return res;
    },
    [fetchExcludedSamples],
  );

  return {
    excludedSamples,
    loading,
    createExcludedSample,
    deleteExcludedSample,
    refresh: fetchExcludedSamples,
  };
}
