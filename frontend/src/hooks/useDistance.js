"use client";

import { useEffect, useState } from "react";

export default function useDistance(analysisProfile) {
  const [samples, setSamples] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [newick, setNewick] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!analysisProfile) return;

    const fetchDistance = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${apiBase}/api/distance/${analysisProfile}`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch distance matrix");
        }

        const data = await res.json();

        setSamples(data.samples || []);
        setMatrix(data.matrix || []);
        setNewick(data.newick || "");
      } catch (err) {
        console.error("Distance fetch error:", err);
        setError(err.message);
        setSamples([]);
        setMatrix([]);
        setNewick("");
      } finally {
        setLoading(false);
      }
    };

    fetchDistance();
  }, [analysisProfile, apiBase]);

  return {
    samples,
    matrix,
    newick,
    loading,
    error,
  };
}
