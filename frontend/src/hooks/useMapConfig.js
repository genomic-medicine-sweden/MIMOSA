import { useState, useEffect } from "react";
import { apiFetch } from "@/utils/apiFetch";

export default function useMapConfig() {
  const [mapConfig, setMapConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL;
        const [configRes, coordsRes, boundariesRes] = await Promise.all([
          apiFetch(`${apiBase}/api/map-config`),
          apiFetch(`${apiBase}/api/map-config/coordinates`),
          apiFetch(`${apiBase}/api/map-config/boundaries`),
        ]);

        if (!configRes?.ok)
          throw new Error(`Server returned ${configRes?.status} on map-config`);
        if (!coordsRes?.ok)
          throw new Error(
            `Server returned ${coordsRes?.status} on coordinates`,
          );
        if (!boundariesRes?.ok)
          throw new Error(
            `Server returned ${boundariesRes?.status} on boundaries`,
          );

        const [config, coords, boundaries] = await Promise.all([
          configRes.json(),
          coordsRes.json(),
          boundariesRes.json(),
        ]);

        if (!cancelled) {
          setMapConfig({ ...config, ...coords, boundariesData: boundaries });
        }
      } catch (err) {
        if (!cancelled)
          setError(err?.message ?? "Failed to load map configuration");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { mapConfig, loading, error };
}
