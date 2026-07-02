"use client";

import React, { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

import {
  getInitialFilterState,
  handleTextFilterChange,
  handleDropdownFilterChange,
  renderTextFilter,
  renderDropdownFilter,
} from "./utils/Utils";

import useAppData from "@/hooks/useAppData";
import { formatDate } from "@/utils/date";

const fmtLogVal = (val) => {
  if (val == null) return "";
  if (typeof val === "object" && val.lat != null)
    return `Lat: ${val.lat}, Lng: ${val.lng}`;
  return String(val);
};

const LogsPage = () => {
  const { logs } = useAppData();
  const [deletionDetail, setDeletionDetail] = useState(null);
  const [conflictDetail, setConflictDetail] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setDeletionDetail(null);
        setConflictDetail(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const flattenedLogs = logs.flatMap((log) => {
    if (log.event === "qc_deletion") {
      return [
        {
          ...log,
          update: null,
          type: "QC Deletion",
          sample_id: "",
          changed_by: log.triggered_by || "",
          date: log.added_at || "",
          changed_field: "QC exclusion",
          change_detail: `${log.deleted_count} sample(s) removed`,
        },
      ];
    }
    if (log.event === "chewbbaca_conflict") {
      const entries = log.conflicts || [];
      const deletedCount = entries.filter(
        (c) => c.store_action === "deleted",
      ).length;
      const ids = entries.map((c) => c.bonsai_id);
      const sampleLabel =
        ids.length <= 3
          ? ids.join(", ")
          : `${ids.slice(0, 3).join(", ")} +${ids.length - 3} more`;
      return [
        {
          ...log,
          update: null,
          type: "Deletion",
          sample_id: sampleLabel,
          changed_by: log.triggered_by || "",
          date: log.added_at || "",
          changed_field: "conflict resolution",
          change_detail:
            deletedCount > 0
              ? `${deletedCount} allele profile(s) removed from MongoDB`
              : `${log.conflict_count} conflict(s) resolved`,
        },
      ];
    }
    if (log.event === "deletion") {
      return [
        {
          ...log,
          update: null,
          type: "Deletion",
          sample_id: log.deleted_ids?.[0] || "",
          changed_by: log.triggered_by || "",
          date: log.added_at || "",
          changed_field: "manual deletion",
          change_detail: "",
        },
      ];
    }
    return log.updates.length > 0
      ? log.updates.map((update) => {
          const changes = update?.changes || {};
          const firstChangedField = Object.keys(changes)[0] || "";
          const firstChange = changes[firstChangedField] || {};
          return {
            ...log,
            update,
            type: "Edit",
            changed_by: update.changed_by || "",
            date: update.date || "",
            changed_field: firstChangedField,
            change_detail:
              firstChangedField && firstChange?.new != null
                ? `${fmtLogVal(firstChange.old)} → ${fmtLogVal(firstChange.new)}`
                : "",
          };
        })
      : [
          {
            ...log,
            update: null,
            type: "Added",
            changed_by: log.added_by || "",
            date: log.added_at || "",
            changed_field: "",
            change_detail: "",
          },
        ];
  });

  const sortedLogs = flattenedLogs.sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const profileOptions = Array.from(
    new Set(sortedLogs.map((log) => log.profile).filter(Boolean)),
  ).map((p) => ({ label: p, value: p }));

  const typeOptions = [
    { label: "Edit", value: "Edit" },
    { label: "Added", value: "Added" },
    { label: "QC Deletion", value: "QC Deletion" },
    { label: "Deletion", value: "Deletion" },
  ];

  const [filters, setFilters] = useState(
    getInitialFilterState(
      [
        "sample_id",
        "profile",
        "type",
        "changed_by",
        "date",
        "changed_field",
        "change_detail",
      ],
      {
        profile: "contains",
        date: "contains",
      },
    ),
  );
  const textFilterChange = handleTextFilterChange(setFilters);
  const dropdownFilterChange = handleDropdownFilterChange(setFilters);

  const resetFilters = () => {
    setFilters(
      getInitialFilterState(
        [
          "sample_id",
          "profile",
          "type",
          "changed_by",
          "date",
          "changed_field",
          "change_detail",
        ],
        {
          profile: "contains",
          date: "contains",
        },
      ),
    );
  };

  return (
    <div className="p-4" style={{ position: "relative" }}>
      <h2 className="text-xl font-bold mb-3">Logs</h2>

      <div className="w-full flex mb-2">
        <button
          onClick={resetFilters}
          className="ml-auto flex items-center gap-2 text-sm text-blue-800 hover:text-blue-600 bg-white border-none px-3 py-1 rounded"
        >
          <span>Reset All Filters</span>
          <i className="pi pi-filter-slash"></i>
        </button>
      </div>

      <style>{`
        .p-datatable .p-datatable-thead > tr:first-child > th {
          background-color: white !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      <DataTable
        value={sortedLogs}
        scrollable
        scrollHeight="500px"
        responsiveLayout="scroll"
        filters={filters}
        filterDisplay="row"
        onFilter={(e) => setFilters(e.filters)}
      >
        <Column
          field="sample_id"
          filter
          filterField="sample_id"
          filterElement={renderTextFilter(
            filters,
            "sample_id",
            "Sample",
            textFilterChange,
          )}
          showFilterMenu={false}
        />
        <Column
          field="profile"
          filter
          filterField="profile"
          filterElement={renderDropdownFilter(
            filters,
            "profile",
            "Profile",
            profileOptions,
            dropdownFilterChange,
          )}
          showFilterMenu={false}
        />
        <Column
          field="type"
          body={(rowData) => rowData.type}
          filter
          filterField="type"
          filterElement={renderDropdownFilter(
            filters,
            "type",
            "Type",
            typeOptions,
            dropdownFilterChange,
          )}
          showFilterMenu={false}
        />
        <Column
          field="date"
          body={(rowData) => formatDate(rowData.date)}
          filter
          filterField="date"
          filterElement={renderTextFilter(
            filters,
            "date",
            "Date",
            textFilterChange,
          )}
          showFilterMenu={false}
        />
        <Column
          field="changed_field"
          filter
          filterField="changed_field"
          filterElement={renderTextFilter(
            filters,
            "changed_field",
            "Change",
            textFilterChange,
          )}
          showFilterMenu={false}
        />
        <Column
          field="change_detail"
          body={(rowData) =>
            rowData.type === "QC Deletion" ? (
              <span
                style={{
                  color: "#2563eb",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
                onClick={() => setDeletionDetail(rowData)}
              >
                {rowData.change_detail}
              </span>
            ) : rowData.type === "Deletion" &&
              rowData.event === "chewbbaca_conflict" ? (
              <span
                style={{
                  color: "#2563eb",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
                onClick={() => setConflictDetail(rowData)}
              >
                {rowData.change_detail}
              </span>
            ) : (
              rowData.change_detail
            )
          }
        />
        <Column
          field="changed_by"
          body={(rowData) => rowData.changed_by}
          filter
          filterField="changed_by"
          filterElement={renderTextFilter(
            filters,
            "changed_by",
            "Updated By",
            textFilterChange,
          )}
          showFilterMenu={false}
        />
      </DataTable>
      {conflictDetail && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "480px",
            height: "100%",
            background: "#fff",
            borderLeft: "1px solid #ddd",
            boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: "1.25rem 1rem 0.75rem",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{ fontWeight: 600, fontSize: "15px", color: "#111827" }}
              >
                Bonsai / chewBBACA Resolution
              </div>
              <div
                style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}
              >
                {conflictDetail.profile}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                {formatDate(conflictDetail.date)} · {conflictDetail.changed_by}
              </div>
              <div
                style={{ fontSize: "13px", color: "#374151", marginTop: "6px" }}
              >
                {conflictDetail.conflict_count} sample(s) found in both sources
              </div>
            </div>
            <button
              onClick={() => setConflictDetail(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "#9ca3af",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem" }}>
            {conflictDetail.conflicts?.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: "0.5rem 0",
                  fontSize: "13px",
                  borderBottom: "1px solid #f9fafb",
                }}
              >
                <div style={{ fontWeight: 500, color: "#111827" }}>
                  {c.bonsai_id}
                </div>
                {c.chewbbaca_id !== c.bonsai_id && (
                  <div style={{ color: "#6b7280" }}>
                    chewBBACA: {c.chewbbaca_id}
                  </div>
                )}
                <div style={{ marginTop: "2px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "1px 8px",
                      borderRadius: "9999px",
                      fontSize: "11px",
                      fontWeight: 500,
                      background:
                        c.action === "use_bonsai"
                          ? "#dbeafe"
                          : c.action === "use_chewbbaca"
                            ? "#d1fae5"
                            : "#f3f4f6",
                      color:
                        c.action === "use_bonsai"
                          ? "#1d4ed8"
                          : c.action === "use_chewbbaca"
                            ? "#065f46"
                            : "#374151",
                    }}
                  >
                    {c.action === "use_bonsai"
                      ? "Bonsai data used"
                      : c.action === "use_chewbbaca"
                        ? "chewBBACA data used"
                        : "Excluded from run"}
                  </span>
                  {c.store_action === "deleted" && (
                    <span
                      style={{
                        marginLeft: "6px",
                        display: "inline-block",
                        padding: "1px 8px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: "#fee2e2",
                        color: "#991b1b",
                      }}
                    >
                      Allele profile removed from MongoDB
                    </span>
                  )}
                  {c.store_action === "kept" && (
                    <span
                      style={{
                        marginLeft: "6px",
                        display: "inline-block",
                        padding: "1px 8px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: "#f3f4f6",
                        color: "#374151",
                      }}
                    >
                      Allele profile kept in MongoDB
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {deletionDetail && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "420px",
            height: "100%",
            background: "#fff",
            borderLeft: "1px solid #ddd",
            boxShadow: "-4px 0 12px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: "1.25rem 1rem 0.75rem",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{ fontWeight: 600, fontSize: "15px", color: "#111827" }}
              >
                QC Deletion
              </div>
              <div
                style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}
              >
                {deletionDetail.profile}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                {formatDate(deletionDetail.date)} · {deletionDetail.changed_by}
              </div>
              <div
                style={{ fontSize: "13px", color: "#374151", marginTop: "6px" }}
              >
                {deletionDetail.deleted_count} sample(s) removed
              </div>
            </div>
            <button
              onClick={() => setDeletionDetail(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                color: "#9ca3af",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem" }}>
            {deletionDetail.deleted_ids?.map((id) => (
              <div
                key={id}
                style={{
                  padding: "0.3rem 0",
                  fontSize: "13px",
                  color: "#374151",
                  borderBottom: "1px solid #f9fafb",
                }}
              >
                {id}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
