"use client";

import { useRef, useState, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { Tooltip } from "primereact/tooltip";
import {
  handleTextFilterChange,
  handleDropdownFilterChange,
  renderTextFilter,
  renderDropdownFilter,
  getInitialFilterState,
  toast,
} from "./utils/Utils";

import useSampleManagement from "@/hooks/useSampleManagement";
import FeatureEditDialog from "./samples/FeatureEditDialog";
import BulkEditDialog from "./samples/BulkEditDialog";
import ExcelDropzone from "./samples/ExcelDropzone";
import DownloadSamplesTemplateButton from "./samples/DownloadSamplesTemplateButton";

import { fieldFeaturesMeta, hospitalOptions } from "./samples/sampleUtils";
import { fieldValidators } from "./samples/samplesValidation";

export default function SamplesPage() {
  const toastRef = useRef(null);
  const { samples, updateSample } = useSampleManagement();

  const [editingOriginalRow, setEditingOriginalRow] = useState(null);
  const [originalPropertiesSnapshot, setOriginalPropertiesSnapshot] =
    useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingEditData, setPendingEditData] = useState(null);

  const [bulkUpdates, setBulkUpdates] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const [lastExcelRows, setLastExcelRows] = useState([]);

  const [filters, setFilters] = useState(
    getInitialFilterState(
      [
        "properties.ID",
        "properties.Hospital",
        "properties.Date",
        "properties.PostCode",
        "statusFilter",
      ],
      {
        "properties.Hospital": "equals",
        "properties.PostCode": "contains",
        statusFilter: "contains",
      },
    ),
  );

  const textFilterChange = handleTextFilterChange(setFilters);
  const dropdownFilterChange = handleDropdownFilterChange(setFilters);

  const fieldErrorsRef = useRef({});

  const setFieldErrors = (updater) => {
    fieldErrorsRef.current =
      typeof updater === "function" ? updater(fieldErrorsRef.current) : updater;
  };

  const resetAllFilters = () => {
    setFilters(
      getInitialFilterState(
        [
          "properties.ID",
          "properties.Hospital",
          "properties.Date",
          "properties.PostCode",
          "statusFilter",
        ],
        {
          "properties.Hospital": "equals",
          "properties.PostCode": "contains",
          statusFilter: "contains",
        },
      ),
    );
  };

  const availableHospitalOptions = Array.from(
    new Set(samples.map((s) => s.properties.Hospital).filter(Boolean)),
  ).map((hospital) => ({ label: hospital, value: hospital }));

  const availableAnalysisProfileOptions = Array.from(
    new Set(samples.map((s) => s.properties.analysis_profile).filter(Boolean)),
  ).map((profile) => ({
    label: profile,
    value: profile,
  }));

  const tableSamples = samples.map((sample) => {
    const props = { ...sample.properties };

    const isIncomplete = ["Hospital", "PostCode", "Date"].some(
      (key) => !props[key]?.trim(),
    );

    const missingLocation = ["Hospital", "PostCode"].every(
      (key) => !props[key]?.trim(),
    );
    let statusFilter = "";

    if (missingLocation) statusFilter += "missingLocation ";
    if (isIncomplete) statusFilter += "incomplete";

    return {
      ...sample,
      properties: props,
      isIncomplete,
      missingLocation,
      statusFilter: statusFilter.trim(),
    };
  });
  const onRowEditInit = (e) => {
    const row = e.data;
    const sampleId = row.properties.ID;

    setEditingOriginalRow({ ...row });
    setOriginalPropertiesSnapshot({ ...row.properties });

    setFieldErrors((prev) => ({
      ...prev,
      [sampleId]: {},
    }));
  };

  const onRowEditCancel = (e) => {
    const sampleId = e.data.properties.ID;

    setEditingOriginalRow(null);
    setOriginalPropertiesSnapshot(null);

    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[sampleId];
      return updated;
    });
  };

  const onRowEditComplete = (e) => {
    const rawProps = e.newData?.properties || {};
    const originalProps = originalPropertiesSnapshot || {};
    const editableFields = ["PostCode", "Hospital", "Date"];
    const changes = {};

    editableFields.forEach((key) => {
      const oldVal = originalProps[key] ?? "";
      const newVal = rawProps[key];
      if (newVal !== undefined && oldVal !== newVal) {
        changes[key] =
          key === "PostCode" && /^\d{5}$/.test(newVal)
            ? `SE-${newVal}`
            : newVal;
      }
    });

    if (Object.keys(changes).length === 0) return;

    setPendingEditData({
      sampleId: originalProps.ID,
      updatedProperties: changes,
    });

    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    const { sampleId, updatedProperties } = pendingEditData;
    try {
      await updateSample(sampleId, updatedProperties);
      toast.success(toastRef, "Sample Updated", `Updated ${sampleId}`);
    } catch {
      toast.error(toastRef, "Error", "Update failed");
    } finally {
      setShowConfirmDialog(false);
      setEditingOriginalRow(null);
      setOriginalPropertiesSnapshot(null);
      setPendingEditData(null);
    }
  };

  const computeBulkFromRows = (rows) => {
    const updates = [];
    const errors = [];

    rows.forEach((row) => {
      const sampleId = row.SampleID;
      if (!sampleId) {
        errors.push({ row: row.__row, message: "Missing SampleID" });
        return;
      }

      const sample = samples.find((s) => s.properties.ID === sampleId);
      if (!sample) {
        errors.push({
          row: row.__row,
          message: `Unknown SampleID: ${sampleId}`,
        });
        return;
      }

      const changes = {};

      ["Hospital", "PostCode", "Date"].forEach((field) => {
        if (row[field] === undefined) return;

        let value = row[field];
        if (field === "PostCode") value = value.replace(/^SE-/, "");

        const validator = fieldValidators[field];
        const result = validator ? validator(value) : "";

        if (result) {
          errors.push({
            row: row.__row,
            sampleId,
            field,
            message: typeof result === "string" ? result : result.error,
            suggestion:
              typeof result === "object" ? result.suggestion : undefined,
            originalValue: value,
          });
          return;
        }

        const normalised =
          field === "PostCode" && /^\d{5}$/.test(value) ? `SE-${value}` : value;

        if (sample.properties[field] !== normalised) {
          changes[field] = normalised;
        }
      });

      if (Object.keys(changes).length > 0) {
        updates.push({
          sampleId,
          changes,
          original: sample.properties,
        });
      }
    });

    setBulkUpdates(updates);
    setBulkErrors(errors);
  };

  const handleParsedExcel = (rows) => {
    setLastExcelRows(rows);
    computeBulkFromRows(rows);
    setShowBulkDialog(true);
  };

  const handleAcceptSuggestion = (field, fromValue, toValue) => {
    const nextRows = lastExcelRows.map((r) => {
      if (r[field] === undefined) return r;
      if (String(r[field]).trim() !== String(fromValue).trim()) return r;
      return { ...r, [field]: toValue };
    });

    setLastExcelRows(nextRows);
    computeBulkFromRows(nextRows);
  };

  const handleBulkConfirm = async () => {
    try {
      for (const u of bulkUpdates) {
        await updateSample(u.sampleId, u.changes);
      }
      toast.success(
        toastRef,
        "Bulk update complete",
        `${bulkUpdates.length} samples updated`,
      );
    } catch (err) {
      toast.error(toastRef, "Bulk update failed", err.message);
    } finally {
      setShowBulkDialog(false);
      setBulkUpdates([]);
      setBulkErrors([]);
      setLastExcelRows([]);
    }
  };

  const textEditor = useCallback(
    (field) => (options) => {
      const sampleId = options.rowData.properties.ID;
      const rowErrors = fieldErrorsRef.current?.[sampleId] || {};
      const error = rowErrors[field] || "";

      const handleChange = (e) => {
        let val = e.target.value;
        if (field === "PostCode") val = val.replace(/^SE-/, "");

        const validator = fieldValidators[field];
        const result = validator ? validator(val) : "";
        const errorMsg =
          typeof result === "string" ? result : result?.error || "";

        setFieldErrors((prev) => {
          const updated = { ...prev };
          const row = { ...(updated[sampleId] || {}) };

          if (errorMsg) row[field] = errorMsg;
          else delete row[field];

          if (Object.keys(row).length > 0) updated[sampleId] = row;
          else delete updated[sampleId];
          return updated;
        });

        options.editorCallback(val);
      };

      const displayValue =
        field === "PostCode"
          ? (options.value?.replace(/^SE-/, "") ?? "")
          : (options.value ?? "");

      return (
        <div className="w-full">
          <InputText
            value={displayValue}
            onChange={handleChange}
            className={`w-full ${error ? "p-invalid" : ""}`}
          />
          {error && <small className="p-error block mt-1">{error}</small>}
        </div>
      );
    },
    [],
  );

  const dropdownEditor = useCallback(
    (field, optionsList) => (options) => (
      <Dropdown
        value={options.value ?? ""}
        options={optionsList}
        onChange={(e) => {
          const selected = e.value;
          options.editorCallback(
            selected && typeof selected === "object"
              ? (selected.value ?? "")
              : (selected ?? ""),
          );
        }}
        placeholder="Select a hospital"
        className="w-full"
      />
    ),
    [],
  );

  return (
    <div style={{ padding: "2rem" }}>
      <h1 className="text-2xl font-bold mb-2">Samples</h1>
      <Toast ref={toastRef} position="bottom-right" />

      <div className="w-full flex mb-3">
        <div className="ml-auto">
          <DownloadSamplesTemplateButton samples={tableSamples} />
        </div>
      </div>

      <ExcelDropzone onParsed={handleParsedExcel} />

      <Tooltip
        target=".status-tag"
        position="right"
        appendTo={() => document.body}
      />

      <div className="w-full flex mb-2">
        <button
          onClick={resetAllFilters}
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
        value={tableSamples}
        editMode="row"
        dataKey="properties.ID"
        onRowEditInit={onRowEditInit}
        onRowEditCancel={onRowEditCancel}
        onRowEditComplete={onRowEditComplete}
        filterDisplay="row"
        filters={filters}
        onFilter={(e) => setFilters(e.filters)}
        scrollable
        scrollHeight="500px"
        tableStyle={{ minWidth: "40rem" }}
        rowEditValidator={(rowData) => {
          const sampleId = rowData.properties.ID;
          const rowErrors = fieldErrorsRef.current?.[sampleId] || {};
          return !Object.values(rowErrors).some(Boolean);
        }}
      >
        <Column
          field="properties.ID"
          style={{ minWidth: "8rem" }}
          filter
          filterField="properties.ID"
          filterElement={renderTextFilter(
            filters,
            "properties.ID",
            fieldFeaturesMeta.SampleID.label,
            textFilterChange,
          )}
          showFilterMenu={false}
        />
        <Column
          field="properties.analysis_profile"
          style={{ minWidth: "8rem" }}
          body={(rowData) => {
            const raw = rowData.properties.analysis_profile;
            if (!raw) return "";

            const formatted = raw.replace(/_/g, " ");
            return <em>{formatted}</em>;
          }}
          filter
          filterField="properties.analysis_profile"
          filterElement={renderDropdownFilter(
            filters,
            "properties.analysis_profile",
            "Analysis Profile",
            availableAnalysisProfileOptions,
            dropdownFilterChange,
          )}
          showFilterMenu={false}
        />

        <Column
          field="properties.Hospital"
          editor={dropdownEditor("Hospital", hospitalOptions)}
          style={{ minWidth: "8rem" }}
          filter
          filterField="properties.Hospital"
          filterElement={renderDropdownFilter(
            filters,
            "properties.Hospital",
            "Hospital",
            availableHospitalOptions,
            dropdownFilterChange,
          )}
          showFilterMenu={false}
        />
        <Column
          field="properties.Date"
          editor={textEditor("Date")}
          filter
          filterField="properties.Date"
          filterElement={renderTextFilter(
            filters,
            "properties.Date",
            "Date",
            textFilterChange,
          )}
          showFilterMenu={false}
        />
        <Column
          field="properties.PostCode"
          editor={textEditor("PostCode")}
          style={{ maxWidth: "8rem" }}
          body={(rowData) =>
            rowData.properties.PostCode?.replace(/^SE-/, "") || ""
          }
          filter
          filterField="properties.PostCode"
          filterFunction={(value, filterText) => {
            const normalizedVal = (value || "")
              .replace(/^SE-/, "")
              .toLowerCase();
            const normalizedFilter = (filterText || "").toLowerCase();
            return normalizedVal.includes(normalizedFilter);
          }}
          filterElement={renderTextFilter(
            filters,
            "properties.PostCode",
            "Postcode",
            textFilterChange,
          )}
          showFilterMenu={false}
        />
        <Column
          field="statusFilter"
          filter
          filterField="statusFilter"
          filterMatchMode="contains"
          showFilterMenu={false}
          filterElement={(options) => (
            <Dropdown
              value={options.value || null}
              options={[
                { label: "Missing location", value: "missingLocation" },
                { label: "Incomplete", value: "incomplete" },
              ]}
              onChange={(e) => options.filterApplyCallback(e.value)}
              placeholder="Select"
              className="p-column-filter"
              showClear
            />
          )}
          body={(rowData) => {
            const tags = [];

            if (rowData.missingLocation) {
              tags.push(
                <span
                  key="missingLocation"
                  className="status-tag"
                  data-pr-tooltip="Hospital or postCode required for map visualisation"
                >
                  <Tag
                    severity="danger"
                    value="Missing location"
                    rounded
                    className="text-xs px-2 py-1"
                    style={{ minWidth: "5rem", textAlign: "center" }}
                  />
                </span>,
              );
            }
            if (rowData.isIncomplete) {
              tags.push(
                <Tag
                  key="incomplete"
                  severity="warning"
                  value="Incomplete"
                  rounded
                  className="text-xs px-2 py-1"
                  style={{ minWidth: "5rem", textAlign: "center" }}
                />,
              );
            }

            if (tags.length === 0) return null;

            return (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                  alignItems: "center",
                }}
              >
                {tags}
              </div>
            );
          }}
          style={{ width: "10rem", textAlign: "center" }}
        />
        <Column rowEditor bodyStyle={{ textAlign: "center" }} />
      </DataTable>

      <FeatureEditDialog
        visible={showConfirmDialog}
        onHide={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirm}
        sampleId={editingOriginalRow?.properties?.ID}
        originalProperties={originalPropertiesSnapshot}
        newProperties={pendingEditData?.updatedProperties}
        fieldFeatures={fieldFeaturesMeta}
      />

      <BulkEditDialog
        visible={showBulkDialog}
        onHide={() => setShowBulkDialog(false)}
        onConfirm={handleBulkConfirm}
        updates={bulkUpdates}
        errors={bulkErrors}
        onAcceptSuggestion={handleAcceptSuggestion}
      />
    </div>
  );
}
