import { useEffect, useState } from "react";

export default function useOutbreaks(analysisProfile) {
  const [outbreaks, setOutbreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOutbreaks = async () => {
    if (!analysisProfile) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/outbreaks?analysis_profile=${analysisProfile}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();

      setOutbreaks(data || []);
    } catch (err) {
      console.error("Failed to fetch outbreaks:", err);
      setError(err.message || "Failed to fetch outbreaks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutbreaks();
  }, [analysisProfile]);

  return {
    outbreaks,
    loading,
    error,
    refresh: fetchOutbreaks,
  };
}
