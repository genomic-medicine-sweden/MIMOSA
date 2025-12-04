"use client";

import React from "react";
import App from "@/components/App";
import useAppData from "@/hooks/useAppData";

export default function AppWrapper() {
  const { data, similarity, logs, dateRange, setDateRange } = useAppData();

  return (
    <App
      data={data}
      similarity={similarity}
      dateRange={dateRange}
      setDateRange={setDateRange}
      logs={logs}
    />
  );
}
