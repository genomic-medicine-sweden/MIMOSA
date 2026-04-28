"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "phylotree/dist/phylotree.css";
import { Button } from "primereact/button";
import { Slider } from "primereact/slider";
import { Dropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";
import styles from "@/styles/TreePage.module.css";

import useAppData from "@/hooks/useAppData";
import useAnalysisProfiles from "@/hooks/useAnalysisProfiles";
import useDistance from "@/hooks/useDistance";
import useClustering from "@/hooks/useClustering";

import { buildCollapsedNewick } from "./tree/newickUtils";
import {
  buildClusterCounts,
  buildClusterSampleMap,
  seedClusterColors,
  buildClusterRenderOptions,
  buildClusterPalette,
} from "./tree/clusterUtils";
import { buildDetailRenderOptions } from "./tree/detailRenderOptions";
import {
  getColorableProperties,
  buildColorByMap,
  buildColorByPalette,
} from "./tree/colorByUtils";
import TreeLegend from "./tree/TreeLegend";
import ClusterPanel from "./tree/clusterPanel";

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 800;

export default function TreePage() {
  const containerRef = useRef(null);
  const displayRef = useRef(null);
  const layoutRef = useRef("linear");
  const debounceRef = useRef(null);

  const [layout, setLayout] = useState("linear");
  const [treeWidth, setTreeWidth] = useState(DEFAULT_WIDTH);
  const [treeHeight, setTreeHeight] = useState(DEFAULT_HEIGHT);
  const [analysisProfile, setAnalysisProfile] = useState("");
  const [viewMode, setViewMode] = useState("cluster");
  const [sampleDisplay, setSampleDisplay] = useState("count");
  const [colorBy, setColorBy] = useState("None");
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [clusterPalette, setClusterPalette] = useState(null);

  const { data } = useAppData();
  const analysisProfiles = useAnalysisProfiles(data);
  const { newick, loading, error } = useDistance(analysisProfile);
  const { clusterMap, loading: clusterLoading } =
    useClustering(analysisProfile);

  useEffect(() => {
    setColorBy("None");
  }, [analysisProfile]);

  useEffect(() => {
    setSelectedCluster(null);
  }, [analysisProfile, viewMode]);

  useEffect(() => {
    if (!analysisProfile && analysisProfiles.length > 0) {
      setAnalysisProfile(analysisProfiles[0]);
    }
  }, [analysisProfiles, analysisProfile]);

  const colorByOptions = useMemo(() => {
    if (!data.length || !analysisProfile) return ["None"];
    const props = getColorableProperties(data, analysisProfile);
    return ["None", ...props];
  }, [data, analysisProfile]);

  const { colorByMap, colorByPalette } = useMemo(() => {
    if (
      viewMode !== "detail" ||
      colorBy === "None" ||
      !data.length ||
      !analysisProfile
    ) {
      return { colorByMap: null, colorByPalette: null };
    }
    const map = buildColorByMap(data, analysisProfile, colorBy, clusterMap);
    const palette = buildColorByPalette(map, colorBy, analysisProfile);
    return { colorByMap: map, colorByPalette: palette };
  }, [viewMode, colorBy, data, analysisProfile, clusterMap]);

  const applyLayout = useCallback(() => {
    if (!displayRef.current) return;
    displayRef.current.radial(layoutRef.current === "radial");
    displayRef.current.unrooted(layoutRef.current === "unrooted");
    displayRef.current.update();
  }, []);

  const setSelectedClusterRef = useRef(setSelectedCluster);
  setSelectedClusterRef.current = setSelectedCluster;

  useEffect(() => {
    if (!newick) return;
    if (clusterLoading) return;

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!containerRef.current) return;

      const { phylotree } = await import("phylotree");
      if (!containerRef.current) return;

      containerRef.current.innerHTML = "";
      containerRef.current.id = "pt-tree-container";

      const isClusterView = viewMode === "cluster";
      let extraOptions = {};

      if (isClusterView) {
        const clusterCounts = buildClusterCounts(clusterMap);
        const clusterSampleMap = buildClusterSampleMap(clusterMap);
        seedClusterColors(clusterCounts, analysisProfile);

        const palette = buildClusterPalette(clusterCounts, analysisProfile);
        setClusterPalette(palette);

        extraOptions = buildClusterRenderOptions(
          clusterCounts,
          analysisProfile,
          sampleDisplay,
          clusterSampleMap,
          (cluster) => setSelectedClusterRef.current(cluster),
        );
      } else {
        setClusterPalette(null);
        extraOptions = buildDetailRenderOptions(colorByMap, colorByPalette);
      }

      const newickToRender = isClusterView
        ? buildCollapsedNewick(newick, clusterMap)
        : newick;

      const tree = new phylotree(newickToRender);

      tree.render({
        container: "#pt-tree-container",
        width: treeWidth,
        height: treeHeight,
        "draw-size-bubbles": false,
        "font-size": 12,
        zoom: true,
        brush: false,
        collapsible: false,
        "left-right-spacing": "fit-to-size",
        "top-bottom-spacing": "fit-to-size",
        ...extraOptions,
      });

      displayRef.current = tree.display;
      applyLayout();
      containerRef.current.appendChild(tree.display.show());
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [
    newick,
    treeWidth,
    treeHeight,
    viewMode,
    clusterMap,
    clusterLoading,
    analysisProfile,
    sampleDisplay,
    colorByMap,
    colorByPalette,
    applyLayout,
  ]);

  const handleLayout = (mode) => {
    layoutRef.current = mode;
    setLayout(mode);
    applyLayout();
  };

  const handleReset = () => {
    setTreeWidth(DEFAULT_WIDTH);
    setTreeHeight(DEFAULT_HEIGHT);

    setLayout("linear");
    layoutRef.current = "linear";
    applyLayout();

    if (displayRef.current) {
      try {
        displayRef.current.zoomScale(1);
        displayRef.current.update();
      } catch (_) {}
    }

    if (containerRef.current) {
      const g = containerRef.current.querySelector("svg g.phylotree-container");
      if (g) {
        g.setAttribute("transform", "");
      }
    }
  };

  const isLoading = loading || clusterLoading;

  const showClusterLegend =
    viewMode === "cluster" && sampleDisplay === "none" && clusterPalette;

  return (
    <div
      className={styles.treeContainer}
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "10px",
          borderBottom: "1px solid #ddd",
          background: "#f9f9f9",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <FloatLabel>
            <Dropdown
              value={analysisProfile}
              onChange={(e) => setAnalysisProfile(e.value)}
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

          <div style={{ width: "1px", height: "28px", background: "#ddd" }} />

          {["detail", "cluster"].map((mode) => (
            <Button
              key={mode}
              label={mode === "detail" ? "Detail View" : "Cluster View"}
              icon={mode === "detail" ? "pi pi-list" : "pi pi-circle-fill"}
              onClick={() => setViewMode(mode)}
              outlined={viewMode !== mode}
              severity={viewMode === mode ? undefined : "secondary"}
            />
          ))}

          {viewMode === "detail" && (
            <FloatLabel>
              <Dropdown
                value={colorBy}
                onChange={(e) => setColorBy(e.value)}
                options={colorByOptions.map((opt) => ({
                  label: opt === "None" ? "None" : opt.replace(/_/g, " "),
                  value: opt,
                }))}
                placeholder="Color by"
                style={{ minWidth: "160px" }}
              />
              <label>Color by</label>
            </FloatLabel>
          )}

          {viewMode === "cluster" && (
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                {
                  value: "none",
                  label: "Hide Labels",
                  icon: "pi pi-eye-slash",
                },
                {
                  value: "count",
                  label: "Sample Count",
                  icon: "pi pi-hashtag",
                },
              ].map(({ value, label, icon }) => (
                <Button
                  key={value}
                  label={label}
                  icon={icon}
                  onClick={() => setSampleDisplay(value)}
                  outlined={sampleDisplay !== value}
                  severity={sampleDisplay === value ? undefined : "secondary"}
                />
              ))}
            </div>
          )}

          <div style={{ width: "1px", height: "28px", background: "#ddd" }} />

          {["linear", "radial", "unrooted"].map((mode) => (
            <Button
              key={mode}
              label={mode.charAt(0).toUpperCase() + mode.slice(1)}
              onClick={() => handleLayout(mode)}
              outlined={layout !== mode}
              severity={layout === mode ? undefined : "secondary"}
            />
          ))}

          <div style={{ width: "1px", height: "28px", background: "#ddd" }} />

          <Button
            label="Reset View"
            icon="pi pi-refresh"
            onClick={handleReset}
            outlined
            severity="secondary"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "60px" }}>Width</span>
            <Slider
              value={treeWidth}
              onChange={(e) => setTreeWidth(e.value)}
              min={300}
              max={1600}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "60px" }}>Height</span>
            <Slider
              value={treeHeight}
              onChange={(e) => setTreeHeight(e.value)}
              min={300}
              max={1600}
              style={{ flex: 1 }}
            />
          </div>
        </div>
      </div>

      {viewMode === "detail" && (
        <TreeLegend colorBy={colorBy} colorByPalette={colorByPalette} />
      )}

      {showClusterLegend && (
        <TreeLegend colorBy="Cluster" colorByPalette={clusterPalette} />
      )}

      {isLoading && (
        <div style={{ padding: "20px", color: "#666" }}>Loading tree...</div>
      )}
      {error && (
        <div style={{ padding: "20px", color: "red" }}>Error: {error}</div>
      )}
      {!isLoading && !error && !newick && analysisProfile && (
        <div style={{ padding: "20px", color: "#666" }}>
          No tree data found for this profile.
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowX: "hidden",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <div ref={containerRef} style={{ width: "100%", minHeight: "800px" }} />
        {viewMode === "cluster" && (
          <ClusterPanel
            cluster={selectedCluster}
            onClose={() => setSelectedCluster(null)}
            data={data}
            analysisProfile={analysisProfile}
          />
        )}
      </div>
    </div>
  );
}
