"use client";

import { useEffect, useState } from "react";

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
      const res = await fetch(`${apiBase}/api/features`, {
        credentials: "include",
      });
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
    const res = await fetch(`${apiBase}/api/features/${sampleId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
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

  return {
    samples,
    loading,
    fetchSamples,
    updateSample,
  };
}
