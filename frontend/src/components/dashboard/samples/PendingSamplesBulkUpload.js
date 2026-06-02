"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import ExcelDropzone from "@/components/dashboard/samples/ExcelDropzone";
import {
  validatePostCode,
  validateHospital,
} from "@/components/dashboard/samples/samplesValidation";
import { getPostcodePrefix } from "@/utils/coordinates";
import { downloadPendingSamplesTemplate } from "@/utils/exportPendingSamplesTemplate";

const COLUMN_HINT =
  "Required: SampleID — plus at least one of: PostCode, Hospital, Latitude + Longitude";

const HEADER_ALIASES = {
  expectedsampleid: "expectedId",
  expected_sample_id: "expectedId",
  expectedid: "expectedId",
  sampleid: "expectedId",
  postcode: "postCode",
  post_code: "postCode",
  hospital: "hospital",
  latitude: "lat",
  lat: "lat",
  longitude: "lng",
  lng: "lng",
};

function normalizeKey(h) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function validateRow(row, { hasHospitalData }) {
  const errors = [];
  const warnings = [];
  let hospitalCorrected = null;

  if (!row.expectedId?.trim()) {
    errors.push("Sample ID is required");
    return { errors, warnings, hospitalCorrected };
  }

  const hasPostCode = !!row.postCode?.trim();
  const hasHospital = !!row.hospital?.trim();
  const hasCoords =
    row.lat !== "" && row.lat != null && row.lng !== "" && row.lng != null;

  if (!hasPostCode && !hasHospital && !hasCoords) {
    errors.push("At least one geo field required");
  }

  if (hasPostCode) {
    const err = validatePostCode(row.postCode.trim());
    if (err)
      errors.push(typeof err === "string" ? err : (err.error ?? String(err)));
  }

  if (hasHospital && hasHospitalData) {
    const result = validateHospital(row.hospital.trim());
    if (result) {
      if (result.suggestion) {
        hospitalCorrected = result.suggestion;
        warnings.push(`Hospital auto-corrected to "${result.suggestion}"`);
      } else {
        errors.push(
          result.error ?? `Hospital "${row.hospital}" is not supported.`,
        );
      }
    }
  }

  if (row.lat !== "" && row.lat != null && isNaN(Number(row.lat)))
    errors.push("Latitude must be a number");
  if (row.lng !== "" && row.lng != null && isNaN(Number(row.lng)))
    errors.push("Longitude must be a number");

  return { errors, warnings, hospitalCorrected };
}

function mapRows(rawRows, { hasHospitalData, existingPendingIds }) {
  return rawRows
    .map((raw) => {
      const mapped = { rowNum: raw.__row };
      for (const [rawKey, val] of Object.entries(raw)) {
        if (rawKey === "__row") continue;
        const alias = HEADER_ALIASES[normalizeKey(rawKey)];
        if (alias) mapped[alias] = val ?? "";
      }
      mapped.expectedId ??= "";
      mapped.postCode ??= "";
      mapped.hospital ??= "";
      mapped.lat ??= "";
      mapped.lng ??= "";

      const { errors, warnings, hospitalCorrected } = validateRow(mapped, {
        hasHospitalData,
      });

      if (
        mapped.expectedId.trim() &&
        existingPendingIds.has(mapped.expectedId.trim())
      ) {
        errors.push("Already in pending samples");
      }

      mapped.errors = errors;
      mapped.warnings = warnings;
      mapped.hospitalCorrected = hospitalCorrected;
      return mapped;
    })
    .filter((r) => r.expectedId || r.postCode || r.hospital || r.lat || r.lng);
}

export default function PendingSamplesBulkUpload({
  createPendingSample,
  toastRef,
  pendingSamples = [],
  hasHospitalData = false,
}) {
  const [rows, setRows] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const validRows = rows?.filter((r) => r.errors.length === 0) ?? [];
  const invalidCount = (rows?.length ?? 0) - validRows.length;

  const handleParsed = (rawRows) => {
    const existingPendingIds = new Set(pendingSamples.map((p) => p.expectedId));
    setRows(mapRows(rawRows, { hasHospitalData, existingPendingIds }));
  };

  const handleSubmit = async () => {
    if (!validRows.length) return;
    setSubmitting(true);

    const prefix = getPostcodePrefix();
    let created = 0;
    const failedRows = [];

    for (const row of validRows) {
      const hasPostCode = !!row.postCode.trim();
      const hospitalToUse = (row.hospitalCorrected ?? row.hospital).trim();
      const hasCoords = row.lat !== "" && row.lng !== "";

      const dto = { expectedId: row.expectedId.trim() };
      if (hasPostCode) {
        const raw = row.postCode.trim();
        dto.postCode = raw.startsWith(prefix) ? raw : `${prefix}${raw}`;
      }
      if (hospitalToUse) dto.hospital = hospitalToUse;
      if (hasCoords)
        dto.manualCoordinates = { lat: Number(row.lat), lng: Number(row.lng) };

      const res = await createPendingSample(dto);
      if (res?.ok) {
        created++;
      } else {
        const body = await res?.json().catch(() => ({}));
        failedRows.push({
          ...row,
          errors: [body?.message || "Failed to save"],
          warnings: [],
        });
      }
    }

    setSubmitting(false);

    const failed = failedRows.length;
    toastRef.current?.show({
      severity: failed === 0 ? "success" : created === 0 ? "error" : "warn",
      summary:
        failed === 0 ? "Done" : created === 0 ? "Failed" : "Partial success",
      detail: `${created} added${failed > 0 ? `, ${failed} failed` : ""}.`,
      life: 5000,
    });

    if (failed === 0) {
      setRows(null);
    } else {
      // Keep only the failed rows so user can see what went wrong
      const skippedRows = rows.filter((r) => r.errors.length > 0);
      setRows([...skippedRows, ...failedRows]);
    }
  };

  const statusBody = (row) => {
    if (row.errors.length > 0) {
      return (
        <span className="text-red-500 text-xs">
          <i className="pi pi-times mr-1" />
          {row.errors.join("; ")}
        </span>
      );
    }
    if (row.warnings.length > 0) {
      return (
        <span className="text-orange-500 text-xs">
          <i className="pi pi-exclamation-triangle mr-1" />
          {row.warnings.join("; ")}
        </span>
      );
    }
    return <i className="pi pi-check text-green-500" />;
  };

  return (
    <div className="surface-card border-1 surface-border border-round p-4 mb-5">
      <h3 className="text-base font-semibold mt-0 mb-1">
        Bulk upload from Excel
      </h3>
      <p className="text-sm text-color-secondary mt-0 mb-3">
        Download the template, fill in your pending samples, then drag and drop
        the file below. Rows with errors are skipped; hospital names are
        auto-corrected when a close match is found.
      </p>

      <Button
        label="Download template"
        icon="pi pi-download"
        className="p-button-outlined p-button-sm mb-3"
        onClick={downloadPendingSamplesTemplate}
      />

      <ExcelDropzone onParsed={handleParsed} columnHint={COLUMN_HINT} />

      {rows !== null && (
        <>
          <DataTable
            value={rows}
            size="small"
            stripedRows
            className="mb-3"
            emptyMessage="No rows parsed."
          >
            <Column header="#" field="rowNum" style={{ width: "3rem" }} />
            <Column header="Sample ID" field="expectedId" />
            <Column header="Post Code" field="postCode" />
            <Column header="Hospital" field="hospital" />
            <Column header="Lat" field="lat" style={{ width: "6rem" }} />
            <Column header="Lng" field="lng" style={{ width: "6rem" }} />
            <Column header="Status" body={statusBody} />
          </DataTable>

          <div className="flex align-items-center gap-3 flex-wrap">
            <Button
              label={
                validRows.length === 0
                  ? "No valid rows"
                  : `Add ${validRows.length} pending sample${validRows.length !== 1 ? "s" : ""}`
              }
              icon="pi pi-plus"
              onClick={handleSubmit}
              loading={submitting}
              disabled={validRows.length === 0}
            />
            <Button
              label="Clear"
              icon="pi pi-times"
              className="p-button-text p-button-secondary"
              onClick={() => setRows(null)}
              disabled={submitting}
            />
            {invalidCount > 0 && (
              <span className="text-sm text-orange-600">
                {invalidCount} row{invalidCount !== 1 ? "s" : ""} with errors
                will be skipped.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
