import { useEffect, useMemo } from "react";
import { Button } from "primereact/button";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  formatPostcode,
  getPostalTown,
  getCounty,
} from "@/utils/locationUtils";

import { useClusterStats, TimelineSection } from "../utils/clusterTimeline";
const SKIP = new Set([
  "QC_Status",
  "Pipeline_Version",
  "Pipeline_Date",
  "analysis_profile",
  "alleles",
  "source",
]);

const PANEL_FIELDS = ["Date", "Hospital", "Postal Town", "County"];

function getMetadata(item) {
  const props = item?.properties;
  if (!props) return {};
  const result = {};

  Object.entries(props).forEach(([key, value]) => {
    if (SKIP.has(key) || key === "typing") return;
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      result[key] = String(value);
    }
  });

  if (props.typing && typeof props.typing === "object") {
    Object.entries(props.typing).forEach(([key, value]) => {
      if (key === "alleles") return;
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        result[key] = String(value);
      }
    });
  }

  const postcode = props.PostCode;
  result["PostCode"] = formatPostcode(postcode);
  result["Postal Town"] = getPostalTown(postcode);
  result["County"] = getCounty(postcode);

  return result;
}

export default function ClusterPanel({
  cluster,
  onClose,
  data = [],
  analysisProfile,
}) {
  useEffect(() => {
    if (!cluster) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cluster, onClose]);

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

  const stats = useClusterStats(cluster?.samples ?? [], metaMap);

  const columns = ["ID", ...PANEL_FIELDS];

  const handleExport = async () => {
    if (!cluster) return;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Cluster ${cluster.clusterID}`);

    ws.columns = columns.map((col) => ({
      header: col,
      key: col,
      width: col === "ID" ? 18 : 22,
    }));

    cluster.samples.forEach((id) => {
      const meta = metaMap[id] ?? {};
      const row = { ID: id };
      PANEL_FIELDS.forEach((col) => {
        row[col] = meta[col] ?? "";
      });
      ws.addRow(row);
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `MIMOSA_cluster_${cluster.clusterID}_samples.xlsx`,
    );
  };

  if (!cluster) return null;

  const { clusterID, samples } = cluster;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "480px",
        height: "100%",
        background: "#fff",
        borderLeft: "1px solid #ddd",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid #eee",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#f9f9f9",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "14px" }}>
            Cluster {clusterID}
          </div>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
            {samples.length} sample{samples.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Button
            label="Export"
            icon="pi pi-file-excel"
            onClick={handleExport}
            outlined
            size="small"
          />
          <Button
            icon="pi pi-times"
            onClick={onClose}
            outlined
            severity="secondary"
            size="small"
          />
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <TimelineSection stats={stats} totalCount={samples.length} />

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f5f5f5",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              {columns.map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: 600,
                    fontSize: "11px",
                    color: "#555",
                    whiteSpace: "nowrap",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {samples.map((id, i) => {
              const meta = metaMap[id] ?? {};
              return (
                <tr
                  key={id}
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  {columns.map((col) => {
                    const value = col === "ID" ? id : (meta[col] ?? "");
                    return (
                      <td
                        key={col}
                        style={{
                          padding: "7px 10px",
                          fontFamily: col === "ID" ? "monospace" : "inherit",
                          color: col === "ID" ? "#333" : "#555",
                          maxWidth: "160px",
                          overflow: "hidden",
                          textOverflow:
                            col === "Hospital" ? "unset" : "ellipsis",
                          whiteSpace:
                            col === "ID" ||
                            col === "PostCode" ||
                            col === "Postal Town"
                              ? "nowrap"
                              : "normal",
                          wordBreak: col === "Hospital" ? "normal" : "unset",
                          overflowWrap:
                            col === "Hospital" ? "break-word" : "unset",
                        }}
                        title={value}
                      >
                        {value ? (
                          value
                        ) : (
                          <span style={{ color: "#ccc" }}></span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
