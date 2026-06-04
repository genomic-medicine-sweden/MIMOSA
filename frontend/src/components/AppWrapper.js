"use client";

import React, { useEffect } from "react";
import App from "@/components/App";
import useAppData from "@/hooks/useAppData";
import useMapConfig from "@/hooks/useMapConfig";
import { initCoordinates } from "@/utils/coordinates";
import { MapConfigContext } from "@/components/MapConfigContext";

export { useMapConfigContext } from "@/components/MapConfigContext";

export default function AppWrapper() {
  const { mapConfig, loading, error } = useMapConfig();
  const appData = useAppData();

  useEffect(() => {
    if (!mapConfig) return;
    initCoordinates(
      mapConfig.postcodeCoordinates,
      mapConfig.hospitalCoordinates,
      mapConfig.postcodePrefix,
      mapConfig.postcodeLength,
      mapConfig.boundariesData,
      mapConfig.regionNameKey,
    );
  }, [mapConfig]);

  if (loading) {
    return (
      <div style={styles.centered}>
        <p style={styles.text}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={{ ...styles.text, color: "#c0392b", maxWidth: 520 }}>
          <strong>Could not load map configuration.</strong>
          <br />
          {error}
        </p>
      </div>
    );
  }

  const { data, similarity, logs, dateRange, setDateRange } = appData;

  return (
    <MapConfigContext.Provider value={mapConfig}>
      <App
        data={data}
        similarity={similarity}
        dateRange={dateRange}
        setDateRange={setDateRange}
        logs={logs}
      />
    </MapConfigContext.Provider>
  );
}

const styles = {
  centered: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  text: { fontSize: 14, color: "#555", textAlign: "center" },
};
