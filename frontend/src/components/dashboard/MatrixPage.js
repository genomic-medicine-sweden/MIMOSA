"use client";

import React, { useState, useMemo } from "react";
import { MultiSelect } from "primereact/multiselect";
import { FloatLabel } from "primereact/floatlabel";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";

import useDistance from "@/hooks/useDistance";
import useAppData from "@/hooks/useAppData";

import { getLeafOrder } from "@/utils/newick";

export default function MatrixPage() {
  const [analysisProfile, setAnalysisProfile] = useState(
    "staphylococcus_aureus",
  );
  const [clusterFilter, setClusterFilter] = useState([]);
  const [sampleFilter, setSampleFilter] = useState([]);

  const { samples, matrix, newick, loading, error } =
    useDistance(analysisProfile);
  const { clusters: appClusters } = useAppData();
  const availableClusters = appClusters || {};

  const treeOrder = useMemo(() => {
    if (!samples?.length || !newick) return [];
    try {
      return getLeafOrder(newick, samples);
    } catch {
      return samples;
    }
  }, [samples, newick]);

  const orderMap = useMemo(() => {
    return new Map(treeOrder.map((id, i) => [id, i]));
  }, [treeOrder]);

  function getOrderIndex(id) {
    const idx = orderMap.get(id);
    return idx !== undefined ? idx : treeOrder.length + 100;
  }

  const clusterSamples = useMemo(() => {
    if (!Array.isArray(samples)) return [];

    if (!clusterFilter.length) return samples;

    const allowed = clusterFilter.flatMap((id) => availableClusters[id] || []);

    return samples.filter((s) => allowed.includes(s));
  }, [clusterFilter, samples]);

  const filteredSamples = useMemo(() => {
    if (!Array.isArray(clusterSamples)) return [];

    const base =
      sampleFilter.length === 0
        ? clusterSamples
        : clusterSamples.filter((s) => sampleFilter.includes(s));

    if (!Array.isArray(base)) return [];

    return [...base].sort((a, b) => getOrderIndex(a) - getOrderIndex(b));
  }, [clusterSamples, sampleFilter, orderMap]);

  const filteredValues = useMemo(() => {
    if (!Array.isArray(filteredSamples) || !Array.isArray(samples) || !matrix)
      return [];

    const indices = filteredSamples.map((s) => samples.indexOf(s));

    return indices.map((rowIndex) =>
      indices.map((colIndex) => matrix[rowIndex]?.[colIndex] ?? 0),
    );
  }, [filteredSamples, samples, matrix]);

  const maxDistance = useMemo(() => {
    if (!Array.isArray(matrix)) return 1;
    return Math.max(...matrix.flat(), 1);
  }, [matrix]);

  function colourScale(value) {
    const ratio = value / maxDistance;
    const r = 255;
    const g = Math.floor(255 - 200 * ratio);
    const b = Math.floor(255 - 200 * ratio);
    return `rgb(${r},${g},${b})`;
  }

  const resetFilters = () => {
    setClusterFilter([]);
    setSampleFilter([]);
  };

  return (
    <div className="p-4 max-h-screen">
      <h1 className="text-lg font-semibold mb-4">Hamming Distance Matrix</h1>

      <div className="card flex flex-wrap gap-4 mb-4">
        <FloatLabel>
          <Dropdown
            value={analysisProfile}
            onChange={(e) => setAnalysisProfile(e.value)}
            options={[
              {
                label: "Staphylococcus aureus",
                value: "staphylococcus_aureus",
              },
            ]}
            placeholder="Select Profile"
            className="w-full"
          />
          <label>Analysis Profile</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={clusterFilter}
            options={Object.keys(availableClusters).map((c) => ({
              label: `Cluster ${c}`,
              value: c,
            }))}
            onChange={(e) => {
              const selected = e.value ?? [];
              setClusterFilter(selected);
              const auto = selected.flatMap(
                (id) => availableClusters[id] || [],
              );
              setSampleFilter(auto);
            }}
            className="w-20rem"
          />
          <label>Clusters</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={sampleFilter}
            options={(clusterSamples || []).map((s) => ({
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
      </div>

      {loading && <p>Loading distance matrix…</p>}
      {error && <p className="text-red-600">Failed to load distance matrix.</p>}

      {!loading && !error && (
        <div
          className="overflow-auto border rounded"
          style={{ width: "100%", height: "50vh" }}
        >
          <table className="border-separate border-spacing-0">
            <thead>
              <tr>
                <th
                  className="bg-white border p-2"
                  style={{
                    position: "sticky",
                    top: 0,
                    left: 0,
                    zIndex: 50,
                  }}
                ></th>
                {filteredSamples.map((s) => (
                  <th
                    key={s}
                    className="bg-white border text-xs p-2 text-center"
                    style={{ position: "sticky", top: 0, zIndex: 40 }}
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
                        colour: "black",
                      }}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
