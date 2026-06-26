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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setDeletionDetail(null);
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
            changed_by: "",
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
