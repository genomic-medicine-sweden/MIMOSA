"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function useSampleManagement() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetchSamples();
  }, []);

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBase}/api/features`);

      if (!res.ok) throw new Error("Failed to fetch samples");
      const data = await res.json();
      setSamples(data);
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateSample = async (sampleId, updatedProperties) => {
    const res = await apiFetch(`${apiBase}/api/features/${sampleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProperties),
    });

    if (!res.ok) throw new Error(await res.text());

    const updated = await res.json();

    setSamples((prev) =>
      prev.map((sample) =>
        sample.properties.ID === sampleId
          ? { ...sample, properties: updated.properties }
          : sample,
      ),
    );

    return updated;
  };

  const deleteSample = async (sampleId) => {
    const res = await apiFetch(
      `${apiBase}/api/features/${encodeURIComponent(sampleId)}`,
      { method: "DELETE" },
    );
    if (!res || !res.ok) throw new Error("Failed to delete sample");
    await fetchSamples();
  };

  return {
    samples,
    loading,
    fetchSamples,
    updateSample,
    deleteSample,
  };
}
