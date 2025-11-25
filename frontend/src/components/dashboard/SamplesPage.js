"use client";

import { useRef, useState, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";

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
  const [filters, setFilters] = useState(
    getInitialFilterState(
      [
        "properties.ID",
        "properties.Hospital",
        "properties.Date",
        "properties.PostCode",
        "isIncomplete",
      ],
      {
        "properties.Hospital": "equals",
        "properties.PostCode": "contains",
        isIncomplete: "equals",
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
          "isIncomplete",
        ],
        {
          "properties.Hospital": "equals",
          "properties.PostCode": "contains",
          isIncomplete: "equals",
        },
      ),
    );
  };

  const availableHospitalOptions = Array.from(
    new Set(samples.map((s) => s.properties.Hospital).filter(Boolean)),
  ).map((hospital) => ({ label: hospital, value: hospital }));

  const tableSamples = samples.map((sample) => {
    const props = { ...sample.properties };
    const requiredFields = ["Hospital", "PostCode", "Date"];
    const isIncomplete = requiredFields.some((key) => !props[key]?.trim());
    return {
      ...sample,
      properties: props,
      isIncomplete,
    };
  });

  const onRowEditInit = (e) => {
    const row = tableSamples[e.index];
    setEditingOriginalRow({ ...row });
    setOriginalPropertiesSnapshot({ ...row.properties });

    setFieldErrors((prev) => ({ ...prev, [e.index]: {} }));
  };

  const onRowEditCancel = (e) => {
    setEditingOriginalRow(null);
    setOriginalPropertiesSnapshot(null);

    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[e.index];
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
      const changed = newVal !== undefined && oldVal !== newVal;

      if (changed) {
        changes[key] =
          key === "PostCode" && /^\d{5}$/.test(newVal)
            ? `SE-${newVal}`
            : newVal;
      }
    });

    if (Object.keys(changes).length === 0) {
      return;
    }

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
    } catch (err) {
      console.error("Update failed:", err);
      toast.error(toastRef, "Error", "Update failed");
    } finally {
      setShowConfirmDialog(false);
      setEditingOriginalRow(null);
      setOriginalPropertiesSnapshot(null);
      setPendingEditData(null);
    }
  };

  const handleCancelDialog = () => {
    setShowConfirmDialog(false);
    setEditingOriginalRow(null);
    setOriginalPropertiesSnapshot(null);
    setPendingEditData(null);
  };

  const textEditor = useCallback(
    (field) => (options) => {
      const rowErrors = fieldErrorsRef.current?.[options.rowIndex] || {};
      const error = rowErrors[field] || "";

      const handleChange = (e) => {
        let val = e.target.value;
        if (field === "PostCode") {
          val = val.replace(/^SE-/, "");
        }

        const validationFn = fieldValidators[field];
        const errorMsg = validationFn ? validationFn(val) : "";

        setFieldErrors((prev) => {
          const updated = { ...prev };
          const row = { ...(updated[options.rowIndex] || {}) };

          if (errorMsg) {
            row[field] = errorMsg;
          } else {
            delete row[field];
          }

          if (Object.keys(row).length > 0) {
            updated[options.rowIndex] = row;
          } else {
            delete updated[options.rowIndex];
          }

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
          const selectedValue =
            selected && typeof selected === "object"
              ? (selected.value ?? "")
              : (selected ?? "");
          options.editorCallback(selectedValue);
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
          const rowIndex = tableSamples.findIndex(
            (s) => s.properties.ID === rowData.properties.ID,
          );
          const rowErrors = fieldErrorsRef.current?.[rowIndex] || {};
          return !Object.values(rowErrors).some((err) => err);
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
          field="isIncomplete"
          body={(rowData) =>
            rowData.isIncomplete ? (
              <Tag severity="warning" value="Incomplete" rounded />
            ) : null
          }
          filter
          filterField="isIncomplete"
          dataType="boolean"
          filterFunction={(value, filter) => {
            if (filter === null || filter === undefined) return true;
            return value === true;
          }}
          filterElement={renderDropdownFilter(
            filters,
            "isIncomplete",
            "Status",
            [{ label: "Incomplete", value: true }],
            dropdownFilterChange,
          )}
          showFilterMenu={false}
          style={{ width: "8rem", textAlign: "center" }}
        />
        <Column
          rowEditor
          headerStyle={{ width: "5rem" }}
          bodyStyle={{ textAlign: "center" }}
        />
      </DataTable>

      <FeatureEditDialog
        visible={showConfirmDialog}
        onHide={handleCancelDialog}
        onConfirm={handleConfirm}
        sampleId={editingOriginalRow?.properties?.ID}
        originalProperties={originalPropertiesSnapshot}
        newProperties={pendingEditData?.updatedProperties}
        fieldFeatures={fieldFeaturesMeta}
      />
    </div>
  );
}
