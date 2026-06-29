"use client";
import { createContext, useContext, useState } from "react";

const ViewModeContext = createContext();

export const ViewModes = {
  OVERVIEW: "overview",
  MY_COUNTY: "myCounty",
  SETTINGS: "settings",
  NOTIFICATIONS: "notifications",
  ADMIN: "admin",
  SAMPLES: "samples",
  PENDING_SAMPLES: "pendingSamples",
  MATRIX: "matrix",
  TREE: "tree",
  TIMELINE: "timeline",
  REPORTS: "reports",
  LOGS: "logs",
  IMPORT: "import",
};

export function ViewModeProvider({ children }) {
  const [viewMode, setViewMode] = useState(ViewModes.OVERVIEW);
  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
