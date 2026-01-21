"use client";

import { useMemo } from "react";

export default function useAnalysisProfiles(data = []) {
  return useMemo(() => {
    if (!Array.isArray(data)) return [];

    return [
      ...new Set(
        data.map((item) => item?.properties?.analysis_profile).filter(Boolean),
      ),
    ].sort();
  }, [data]);
}
