"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { MultiSelect } from "primereact/multiselect";
import { FloatLabel } from "primereact/floatlabel";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";

import useDistance from "@/hooks/useDistance";
import useAppData from "@/hooks/useAppData";
import useAnalysisProfiles from "@/hooks/useAnalysisProfiles";
import { getLeafOrder } from "@/utils/newick";

function MatrixTable({
  filteredSamples,
  filteredValues,
  colourScale,
  tableRef,
  verticalHeaders,
}) {
  return (
    <table ref={tableRef} className="border-separate border-spacing-0">
      <thead>
        <tr>
          <th
            className="bg-white border p-2"
            style={{ position: "sticky", top: 0, left: 0, zIndex: 50 }}
          />
          {filteredSamples.map((s) => (
            <th
              key={s}
              className="bg-white border text-xs text-center"
              style={
                verticalHeaders
                  ? {
                      position: "sticky",
                      top: 0,
                      zIndex: 40,
                      writingMode: "vertical-lr",
                      transform: "rotate(180deg)",
                      whiteSpace: "nowrap",
                      height: "140px",
                      padding: "4px 6px",
                      verticalAlign: "bottom",
                    }
                  : {
                      position: "sticky",
                      top: 0,
                      zIndex: 40,
                      padding: "8px",
                    }
              }
            >
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filteredValues.map((row, i) => (
          <tr key={filteredSamples[i]}>
            <th
              className="bg-white border text-xs p-2 text-center"
              style={{ position: "sticky", left: 0, zIndex: 30 }}
            >
              {filteredSamples[i]}
            </th>
            {row.map((value, j) => (
              <td
                key={j}
                className="border text-xs text-center"
                title={`${filteredSamples[i]} vs ${filteredSamples[j]}`}
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: colourScale(value),
                  color: "black",
                }}
              >
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MatrixView({ initialProfile = "", fullPage = false }) {
  const { data, clusters: appClusters } = useAppData();
  const availableClusters = appClusters || {};
  const analysisProfiles = useAnalysisProfiles(data);

  const [analysisProfile, setAnalysisProfile] = useState(initialProfile);
  const [clusterFilter, setClusterFilter] = useState([]);
  const [sampleFilter, setSampleFilter] = useState([]);

  useEffect(() => {
    if (!analysisProfile && analysisProfiles.length > 0) {
      setAnalysisProfile(analysisProfiles[0]);
    }
  }, [analysisProfiles, analysisProfile]);

  const { samples, matrix, newick, loading, error } =
    useDistance(analysisProfile);

  const profileClusters = useMemo(() => {
    if (!samples?.length) return {};
    const sampleSet = new Set(samples);
    return Object.fromEntries(
      Object.entries(availableClusters)
        .map(([clusterId, clusterMembers]) => [
          clusterId,
          clusterMembers.filter((s) => sampleSet.has(s)),
        ])
        .filter(([, members]) => members.length > 0),
    );
  }, [availableClusters, samples]);

  const treeOrder = useMemo(() => {
    if (!samples?.length || !newick) return [];
    try {
      return getLeafOrder(newick, samples);
    } catch {
      return samples;
    }
  }, [samples, newick]);

  const orderMap = useMemo(
    () => new Map(treeOrder.map((id, i) => [id, i])),
    [treeOrder],
  );

  const getOrderIndex = (id) => orderMap.get(id) ?? treeOrder.length + 100;

  const clusterSamples = useMemo(() => {
    if (!Array.isArray(samples)) return [];
    if (!clusterFilter.length) return samples;
    const allowed = clusterFilter.flatMap((id) => profileClusters[id] || []);
    return samples.filter((s) => allowed.includes(s));
  }, [clusterFilter, samples, profileClusters]);

  const filteredSamples = useMemo(() => {
    const base =
      sampleFilter.length === 0
        ? clusterSamples
        : clusterSamples.filter((s) => sampleFilter.includes(s));
    return [...base].sort((a, b) => getOrderIndex(a) - getOrderIndex(b));
  }, [clusterSamples, sampleFilter, orderMap]);

  const filteredValues = useMemo(() => {
    if (!filteredSamples.length || !matrix || !samples) return [];
    const indices = filteredSamples.map((s) => samples.indexOf(s));
    return indices.map((i) => indices.map((j) => matrix[i]?.[j] ?? 0));
  }, [filteredSamples, samples, matrix]);

  const maxDistance = useMemo(
    () => Math.max(...(matrix?.flat() ?? []), 1),
    [matrix],
  );

  const colourScale = (value) => {
    const ratio = value / maxDistance;
    const r = 255;
    const g = Math.floor(255 - 200 * ratio);
    const b = Math.floor(255 - 200 * ratio);
    return `rgb(${r},${g},${b})`;
  };

  const tableRef = useRef(null);
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const obs = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const verticalHeaders =
    containerWidth > 0 && filteredSamples.length * 45 > containerWidth - 120;

  const estimatedExportWidth = filteredSamples.length * 40 + 120;
  const estimatedExportHeight =
    filteredSamples.length * 40 + (verticalHeaders ? 140 : 30);
  const exportTooLarge =
    estimatedExportWidth > 8000 ||
    estimatedExportHeight > 8000 ||
    estimatedExportWidth * estimatedExportHeight > 64_000_000;

  const exportTooltip = exportTooLarge
    ? `Matrix too large to export (${filteredSamples.length}×${filteredSamples.length} samples)`
    : "Export PNG";

  const handleExportPng = async () => {
    if (!tableRef.current) return;
    const domtoimage = (await import("dom-to-image")).default;

    const table = tableRef.current;
    const scrollDiv = scrollRef.current;

    const stickyEls = Array.from(table.querySelectorAll('[style*="sticky"]'));
    const savedPositions = stickyEls.map((el) => el.style.position);

    const savedHeight = scrollDiv?.style.height ?? "";
    const savedOverflow = scrollDiv?.style.overflow ?? "";

    if (scrollDiv) {
      scrollDiv.style.height = "auto";
      scrollDiv.style.overflow = "visible";
    }
    stickyEls.forEach((el) => {
      el.style.position = "static";
    });

    try {
      const dataUrl = await domtoimage.toPng(table, { bgcolor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `MIMOSA_matrix_${analysisProfile || "export"}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.png`;
      a.click();
    } finally {
      if (scrollDiv) {
        scrollDiv.style.height = savedHeight;
        scrollDiv.style.overflow = savedOverflow;
      }
      stickyEls.forEach((el, i) => {
        el.style.position = savedPositions[i];
      });
    }
  };

  const resetFilters = () => {
    setClusterFilter([]);
    setSampleFilter([]);
  };

  const changeProfile = (profile) => {
    setAnalysisProfile(profile);
    setClusterFilter([]);
    setSampleFilter([]);
  };

  if (fullPage) {
    return (
      <div
        ref={containerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid #ddd",
            background: "#f9f9f9",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: "14px",
              color: "#333",
              marginRight: 4,
            }}
          >
            Hamming Distance Matrix
          </span>

          <div style={{ width: "1px", height: "28px", background: "#ddd" }} />

          <FloatLabel>
            <Dropdown
              value={analysisProfile}
              onChange={(e) => changeProfile(e.value)}
              options={analysisProfiles.map((profile) => ({
                label: profile.replace(/_/g, " "),
                value: profile,
              }))}
              placeholder="Select Profile"
              style={{ minWidth: "200px" }}
              filter
            />
            <label>Analysis Profile</label>
          </FloatLabel>

          <FloatLabel>
            <MultiSelect
              value={clusterFilter}
              options={Object.keys(profileClusters).map((c) => ({
                label: c,
                value: c,
              }))}
              onChange={(e) => {
                const selected = e.value ?? [];
                setClusterFilter(selected);
                setSampleFilter(
                  selected.flatMap((id) => profileClusters[id] || []),
                );
              }}
              style={{ minWidth: "160px" }}
              maxSelectedLabels={2}
            />
            <label>Clusters</label>
          </FloatLabel>

          <FloatLabel>
            <MultiSelect
              value={sampleFilter}
              options={clusterSamples.map((s) => ({ label: s, value: s }))}
              onChange={(e) => setSampleFilter(e.value ?? [])}
              placeholder="Samples"
              style={{ minWidth: "160px" }}
              maxSelectedLabels={2}
              filter
            />
            <label>Samples</label>
          </FloatLabel>

          <Button
            label="Reset"
            icon="pi pi-refresh"
            onClick={resetFilters}
            outlined
            severity="secondary"
            size="small"
          />

          <Button
            icon="pi pi-download"
            onClick={handleExportPng}
            outlined
            severity="secondary"
            size="small"
            disabled={!filteredSamples.length || loading || exportTooLarge}
            tooltip={exportTooltip}
            tooltipOptions={{ position: "bottom", showOnDisabled: true }}
          />
        </div>

        <div
          ref={scrollRef}
          style={{ flex: 1, overflow: "auto", padding: "16px" }}
        >
          {loading && <p style={{ color: "#666" }}>Loading distance matrix…</p>}
          {error && (
            <p style={{ color: "#dc2626" }}>Failed to load distance matrix.</p>
          )}
          {!loading && !error && (
            <MatrixTable
              filteredSamples={filteredSamples}
              filteredValues={filteredValues}
              colourScale={colourScale}
              tableRef={tableRef}
              verticalHeaders={verticalHeaders}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-4 max-h-screen">
      <h1 className="text-lg font-semibold mb-4">Hamming Distance Matrix</h1>

      <div className="card flex flex-wrap gap-4 mb-4">
        <FloatLabel>
          <Dropdown
            value={analysisProfile}
            onChange={(e) => changeProfile(e.value)}
            options={analysisProfiles.map((profile) => ({
              label: profile.replace(/_/g, " "),
              value: profile,
            }))}
            placeholder="Select Profile"
            className="w-full"
            filter
          />
          <label>Analysis Profile</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={clusterFilter}
            options={Object.keys(profileClusters).map((c) => ({
              label: c,
              value: c,
            }))}
            onChange={(e) => {
              const selected = e.value ?? [];
              setClusterFilter(selected);
              setSampleFilter(
                selected.flatMap((id) => profileClusters[id] || []),
              );
            }}
            className="w-20rem"
          />
          <label>Clusters</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={sampleFilter}
            options={clusterSamples.map((s) => ({
              label: s,
              value: s,
            }))}
            onChange={(e) => setSampleFilter(e.value ?? [])}
            placeholder="Samples"
            className="w-20rem"
            maxSelectedLabels={3}
            filter
          />
          <label>Samples</label>
        </FloatLabel>

        <Button
          label="Reset Filters"
          icon="pi pi-refresh"
          onClick={resetFilters}
        />

        <Button
          icon="pi pi-download"
          onClick={handleExportPng}
          outlined
          severity="secondary"
          disabled={!filteredSamples.length || loading || exportTooLarge}
          tooltip={exportTooltip}
          tooltipOptions={{ position: "bottom", showOnDisabled: true }}
        />

        <Button
          icon="pi pi-external-link"
          onClick={() =>
            window.open(
              `/matrix${analysisProfile ? `?profile=${encodeURIComponent(analysisProfile)}` : ""}`,
              "_blank",
            )
          }
          outlined
          severity="secondary"
          tooltip="Open full page in new tab"
          tooltipOptions={{ position: "bottom" }}
        />
      </div>

      {loading && <p>Loading distance matrix…</p>}
      {error && <p className="text-red-600">Failed to load distance matrix.</p>}

      {!loading && !error && (
        <div
          ref={scrollRef}
          className="overflow-auto border rounded"
          style={{ width: "100%", height: "50vh" }}
        >
          <MatrixTable
            filteredSamples={filteredSamples}
            filteredValues={filteredValues}
            colourScale={colourScale}
            tableRef={tableRef}
            verticalHeaders={verticalHeaders}
          />
        </div>
      )}
    </div>
  );
}
