"use client";

import { useMemo, useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";
import { MultiSelect } from "primereact/multiselect";
import { Button } from "primereact/button";

import useAppData from "@/hooks/useAppData";
import useAnalysisProfiles from "@/hooks/useAnalysisProfiles";
import useClustering from "@/hooks/useClustering";
import { getColor, SINGLETON_COLOR } from "@/utils/ColorAssignment";
import {
  parseDate,
  formatMonthYear,
  StatBox,
  KeyEventsDetailed,
  useClusterStats,
} from "./utils/clusterTimeline";
import {
  isSingleton,
  clusterDisplayLabel,
  getMetadata,
  matchesLocationFilters,
  bucketKey,
  bucketLabel,
  buildChartLabels,
} from "./utils/timelineUtils";
import StackedClusterBar from "@/components/charts/StackedClusterBar";

const RESOLUTION_OPTIONS = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
];

function ColorSwatch({ color }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        background: color,
        opacity: 0.88,
        flexShrink: 0,
      }}
    />
  );
}

function EpiCurve({
  rows,
  clusterColors,
  clusterList,
  resolution,
  onClickCluster,
}) {
  const allKeys = useMemo(
    () =>
      Array.from(new Set(rows.flatMap((r) => Object.keys(r.counts)))).sort(),
    [rows],
  );

  if (!rows.length || !allKeys.length) return null;

  const datasets = clusterList
    .map((c) => c.clusterID)
    .filter((cid) => rows.some((r) => r.clusterId === cid))
    .map((cid) => ({
      label: clusterDisplayLabel(cid),
      data: allKeys.map(
        (key) => rows.find((r) => r.clusterId === cid)?.counts[key] ?? 0,
      ),
      backgroundColor: clusterColors[cid] ?? "#90a4ae",
      borderColor: "#ffffff",
      borderWidth: 1,
      stack: "stack",
      clusterId: cid,
    }));

  const tooltipCallbacks = {
    title: (items) => bucketLabel(allKeys[items[0].dataIndex], resolution),
    label: (item) => `${item.dataset.label}: ${item.raw}`,
  };

  const handleClick = (_e, elements, ds) => {
    const cid = elements.length
      ? ds[elements[0].datasetIndex]?.clusterId
      : null;
    if (cid && !isSingleton(cid)) onClickCluster?.(cid);
  };

  return (
    <StackedClusterBar
      datasets={datasets}
      labels={buildChartLabels(allKeys, resolution)}
      tooltipCallbacks={tooltipCallbacks}
      onClick={handleClick}
    />
  );
}

function ClusterLegend({
  activeClusters,
  timeplotRows,
  clusterColors,
  focusedCluster,
  onToggle,
}) {
  const datedClusters = activeClusters.filter((c) =>
    timeplotRows.some(
      (r) => r.clusterId === c.clusterID && Object.keys(r.counts).length > 0,
    ),
  );
  const nonSingletons = datedClusters.filter((c) => !isSingleton(c.clusterID));
  const hasSingletons = datedClusters.some((c) => isSingleton(c.clusterID));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        marginBottom: "14px",
        alignItems: "center",
      }}
    >
      {nonSingletons.map(({ clusterID }) => {
        const isFocused = focusedCluster === clusterID;
        return (
          <button
            key={clusterID}
            onClick={() => onToggle(clusterID)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "11px",
              color: isFocused ? "#333" : "#666",
              background: isFocused ? "#f5f5f5" : "transparent",
              border: `1px solid ${isFocused ? "#ddd" : "transparent"}`,
              borderRadius: "4px",
              padding: "3px 7px",
              cursor: "pointer",
              fontWeight: isFocused ? 600 : 400,
            }}
          >
            <ColorSwatch color={clusterColors[clusterID]} />
            {String(clusterID)}
          </button>
        );
      })}
      {hasSingletons && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11px",
            color: "#999",
            padding: "3px 7px",
          }}
        >
          <ColorSwatch color={SINGLETON_COLOR} />
          Singleton
        </span>
      )}
      <span style={{ fontSize: "10px", color: "#ccc", marginLeft: "4px" }}>
        Click a cluster or square to see its summary
      </span>
    </div>
  );
}

function ClusterSummaryPanel({ clusterID, samples, metaMap, color, onClose }) {
  const stats = useClusterStats(samples, metaMap);
  const missingDates = stats ? stats.totalCount - stats.datedCount : 0;
  const durationLabel = !stats
    ? null
    : stats.durationMonths < 1
      ? "< 1 month"
      : stats.durationMonths === 1
        ? "1 month"
        : `${stats.durationMonths} months`;

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderTop: `3px solid ${color ?? "#42a5f5"}`,
        borderRadius: "6px",
        background: "#fff",
        padding: "12px 14px",
        marginTop: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ColorSwatch color={color} />
          <span style={{ fontWeight: 600, fontSize: "13px", color: "#333" }}>
            {clusterDisplayLabel(clusterID)}
          </span>
          <span style={{ fontSize: "11px", color: "#aaa" }}>
            {samples.length} sample{samples.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          icon="pi pi-times"
          onClick={onClose}
          outlined
          severity="secondary"
          size="small"
        />
      </div>

      {!stats ? (
        <div style={{ fontSize: "11px", color: "#ccc", fontStyle: "italic" }}>
          No collection dates available for this cluster.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
            <StatBox
              label="First case"
              value={formatMonthYear(stats.firstDate)}
            />
            <StatBox
              label="Last case"
              value={formatMonthYear(stats.lastDate)}
            />
            <StatBox label="Duration" value={durationLabel} />
          </div>
          <KeyEventsDetailed stats={stats} />
          {missingDates > 0 && (
            <div
              style={{
                fontSize: "10px",
                color: "#ccc",
                fontStyle: "italic",
                marginTop: "4px",
              }}
            >
              {missingDates} sample{missingDates !== 1 ? "s" : ""} without
              collection date
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TimelinePage() {
  const { data } = useAppData();
  const analysisProfiles = useAnalysisProfiles(data);

  const [analysisProfile, setAnalysisProfile] = useState("");
  const [resolution, setResolution] = useState("weekly");
  const [selectedClusters, setSelectedClusters] = useState([]);
  const [selectedHospitals, setSelectedHospitals] = useState([]);
  const [selectedCounties, setSelectedCounties] = useState([]);
  const [selectedTowns, setSelectedTowns] = useState([]);
  const [focusedCluster, setFocusedCluster] = useState(null);

  useMemo(() => {
    if (!analysisProfile && analysisProfiles.length > 0)
      setAnalysisProfile(analysisProfiles[0]);
  }, [analysisProfiles, analysisProfile]);

  const { clusterMap, loading: clusterLoading } =
    useClustering(analysisProfile);

  const metaMap = useMemo(() => {
    const map = {};
    data
      .filter((item) => item.properties?.analysis_profile === analysisProfile)
      .forEach((item) => {
        const id = item.properties?.ID;
        if (id) map[id] = getMetadata(item);
      });
    return map;
  }, [data, analysisProfile]);

  const clusterList = useMemo(() => {
    if (!clusterMap) return [];
    const grouped = {};
    Object.entries(clusterMap).forEach(([sampleId, clusterID]) => {
      (grouped[clusterID] ??= []).push(sampleId);
    });
    return Object.entries(grouped)
      .map(([clusterID, samples]) => ({ clusterID, samples }))
      .sort((a, b) => b.samples.length - a.samples.length);
  }, [clusterMap]);

  const clusterColors = useMemo(() => {
    const map = {};
    clusterList.forEach((c) => {
      map[c.clusterID] = isSingleton(c.clusterID)
        ? SINGLETON_COLOR
        : getColor(String(c.clusterID), analysisProfile, true);
    });
    return map;
  }, [clusterList, analysisProfile]);

  const locationFilters = useMemo(
    () => ({ selectedHospitals, selectedCounties, selectedTowns }),
    [selectedHospitals, selectedCounties, selectedTowns],
  );
  const hasLocationFilter = !!(
    selectedHospitals.length ||
    selectedCounties.length ||
    selectedTowns.length
  );

  const filterOptions = useMemo(() => {
    const hospitals = new Set();
    const counties = new Set();
    const towns = new Set();

    const nonSingletonSampleIds = new Set(
      clusterList
        .filter((c) => !isSingleton(c.clusterID))
        .flatMap((c) => c.samples),
    );

    nonSingletonSampleIds.forEach((id) => {
      const { Hospital, County, "Postal Town": town } = metaMap[id] ?? {};
      if (Hospital) hospitals.add(Hospital);
      if (County) counties.add(County);
      if (town) towns.add(town);
    });

    const toOpts = (set) =>
      Array.from(set)
        .sort()
        .map((v) => ({ label: v, value: v }));
    const hasSingletons = clusterList.some((c) => isSingleton(c.clusterID));
    return {
      clusters: [
        ...clusterList
          .filter((c) => !isSingleton(c.clusterID))
          .map((c) => ({ label: String(c.clusterID), value: c.clusterID })),
        ...(hasSingletons
          ? [{ label: "Singleton", value: "__singleton__" }]
          : []),
      ],
      hospitals: toOpts(hospitals),
      counties: toOpts(counties),
      towns: toOpts(towns),
    };
  }, [metaMap, clusterList]);

  const activeClusters = useMemo(() => {
    const expanded = selectedClusters.flatMap((v) =>
      v === "__singleton__"
        ? clusterList
            .filter((c) => isSingleton(c.clusterID))
            .map((c) => c.clusterID)
        : [v],
    );
    return clusterList.filter((c) => {
      if (expanded.length && !expanded.includes(c.clusterID)) return false;
      if (!hasLocationFilter) return true;
      return c.samples.some((id) =>
        matchesLocationFilters(metaMap[id] ?? {}, locationFilters),
      );
    });
  }, [
    clusterList,
    selectedClusters,
    hasLocationFilter,
    locationFilters,
    metaMap,
  ]);

  const timeplotRows = useMemo(
    () =>
      activeClusters
        .map((c) => {
          const counts = {};
          let counted = 0;
          c.samples.forEach((id) => {
            if (
              hasLocationFilter &&
              !matchesLocationFilters(metaMap[id] ?? {}, locationFilters)
            )
              return;
            const d = parseDate(metaMap[id]?.Date);
            if (!d) return;
            const key = bucketKey(d, resolution);
            counts[key] = (counts[key] || 0) + 1;
            counted++;
          });
          return { clusterId: c.clusterID, counts, total: counted };
        })
        .filter((r) => r.total > 0),
    [activeClusters, metaMap, resolution, hasLocationFilter, locationFilters],
  );

  const focusedClusterData = useMemo(
    () =>
      focusedCluster
        ? (activeClusters.find((c) => c.clusterID === focusedCluster) ?? null)
        : null,
    [focusedCluster, activeClusters],
  );

  const hasFilters = !!(
    selectedClusters.length ||
    selectedHospitals.length ||
    selectedCounties.length ||
    selectedTowns.length
  );

  const clearFilters = () => {
    setSelectedClusters([]);
    setSelectedHospitals([]);
    setSelectedCounties([]);
    setSelectedTowns([]);
  };

  const handleProfileChange = (value) => {
    setAnalysisProfile(value);
    clearFilters();
    setFocusedCluster(null);
  };

  const toggleFocusedCluster = (cid) =>
    setFocusedCluster((prev) => (prev === cid ? null : cid));

  const renderContent = () => {
    if (clusterLoading)
      return (
        <div style={{ padding: "20px", color: "#666" }}>Loading timeline…</div>
      );
    if (!clusterMap)
      return (
        <div style={{ padding: "20px", color: "#aaa" }}>
          Select an analysis profile to view the timeline.
        </div>
      );
    if (!activeClusters.length)
      return (
        <div style={{ padding: "20px", color: "#aaa" }}>
          No clusters match the current filters.
        </div>
      );

    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "6px",
            padding: "12px 14px",
          }}
        >
          <ClusterLegend
            activeClusters={activeClusters}
            timeplotRows={timeplotRows}
            clusterColors={clusterColors}
            focusedCluster={focusedCluster}
            onToggle={toggleFocusedCluster}
          />
          <EpiCurve
            rows={timeplotRows}
            clusterColors={clusterColors}
            clusterList={activeClusters}
            resolution={resolution}
            onClickCluster={toggleFocusedCluster}
          />
        </div>

        {focusedClusterData && (
          <ClusterSummaryPanel
            clusterID={focusedClusterData.clusterID}
            samples={focusedClusterData.samples}
            metaMap={metaMap}
            color={clusterColors[focusedClusterData.clusterID]}
            onClose={() => setFocusedCluster(null)}
          />
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid #ddd",
          background: "#f9f9f9",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <FloatLabel>
          <Dropdown
            value={analysisProfile}
            onChange={(e) => handleProfileChange(e.value)}
            options={analysisProfiles.map((p) => ({
              label: p.replace(/_/g, " "),
              value: p,
            }))}
            placeholder="Select Profile"
            style={{ minWidth: "200px" }}
            filter
          />
          <label>Analysis Profile</label>
        </FloatLabel>

        <div style={{ width: "1px", height: "28px", background: "#ddd" }} />

        <div style={{ display: "flex", gap: "4px" }}>
          {RESOLUTION_OPTIONS.map(({ label, value }) => (
            <Button
              key={value}
              label={label}
              onClick={() => setResolution(value)}
              outlined={resolution !== value}
              severity={resolution === value ? undefined : "secondary"}
              size="small"
            />
          ))}
        </div>

        <div style={{ width: "1px", height: "28px", background: "#ddd" }} />

        <FloatLabel>
          <MultiSelect
            value={selectedClusters}
            onChange={(e) => setSelectedClusters(e.value)}
            options={filterOptions.clusters}
            style={{ minWidth: "180px" }}
            maxSelectedLabels={2}
            filter
          />
          <label>Cluster</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={selectedHospitals}
            onChange={(e) => setSelectedHospitals(e.value)}
            options={filterOptions.hospitals}
            style={{ minWidth: "180px" }}
            maxSelectedLabels={2}
            filter
          />
          <label>Hospital</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={selectedCounties}
            onChange={(e) => setSelectedCounties(e.value)}
            options={filterOptions.counties}
            style={{ minWidth: "160px" }}
            maxSelectedLabels={2}
            filter
          />
          <label>County</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={selectedTowns}
            onChange={(e) => setSelectedTowns(e.value)}
            options={filterOptions.towns}
            style={{ minWidth: "160px" }}
            maxSelectedLabels={2}
            filter
          />
          <label>Postal Town</label>
        </FloatLabel>

        <Button
          label="Reset filters"
          icon="pi pi-filter-slash"
          onClick={clearFilters}
          outlined
          severity="secondary"
          size="small"
          disabled={!hasFilters}
        />
      </div>

      {renderContent()}
    </div>
  );
}
