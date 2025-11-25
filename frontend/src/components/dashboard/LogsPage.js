"use client";

import React, { useState } from "react";
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

const LogsPage = () => {
  const { logs } = useAppData();

  const formatDate = (date) => new Date(date).toLocaleString();

  const flattenedLogs = logs.flatMap((log) =>
    log.updates.length > 0
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
                ? `${firstChange.old ?? ""} → ${firstChange.new}`
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
        ],
  );

  const sortedLogs = flattenedLogs.sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const profileOptions = Array.from(
    new Set(sortedLogs.map((log) => log.profile).filter(Boolean)),
  ).map((p) => ({ label: p, value: p }));

  const typeOptions = [
    { label: "Edit", value: "Edit" },
    { label: "Added", value: "Added" },
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
    <div className="p-4">
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
        <Column field="change_detail" />
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
    </div>
  );
};

export default LogsPage;
