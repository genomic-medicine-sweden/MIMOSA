"use client";

import { useRef, useState, useMemo } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { useMapConfigContext } from "@/components/AppWrapper";
import { validatePostCode } from "@/components/dashboard/samples/samplesValidation";
import { getPostcodePrefix } from "@/utils/coordinates";
import usePendingSamples from "@/hooks/usePendingSamples";
import PendingSamplesInfoDialog from "@/components/dashboard/Info/PendingSamplesInfoDialog";
import PendingSamplesBulkUpload from "@/components/dashboard/samples/PendingSamplesBulkUpload";

const EMPTY_FORM = {
  expectedId: "",
  postCode: "",
  hospital: "",
  lat: "",
  lng: "",
};

export default function PendingSamplesPage() {
  const toastRef = useRef(null);
  const { hospitalCoordinates = {} } = useMapConfigContext() ?? {};
  const {
    pendingSamples,
    loading,
    createPendingSample,
    updatePendingSample,
    deletePendingSample,
  } = usePendingSamples();

  const [form, setForm] = useState(EMPTY_FORM);
  const [postCodeError, setPostCodeError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const hasHospitalData = Object.keys(hospitalCoordinates).length > 0;

  const hospitalOptions = useMemo(
    () =>
      Object.keys(hospitalCoordinates).map((name) => ({
        label: name,
        value: name,
      })),
    [hospitalCoordinates],
  );

  const shownColumns = useMemo(
    () => ({
      postCode: pendingSamples.some((s) => s.postCode),
      hospital: pendingSamples.some((s) => s.hospital),
      coordinates: pendingSamples.some((s) => s.manualCoordinates),
    }),
    [pendingSamples],
  );

  const isFormValid = useMemo(() => {
    if (!form.expectedId.trim()) return false;
    const hasPostCode = !!form.postCode.trim();
    const hasHospital = !!form.hospital;
    const hasCoords = form.lat !== "" && form.lng !== "";
    if (!hasPostCode && !hasHospital && !hasCoords) return false;
    if (hasPostCode && postCodeError) return false;
    return true;
  }, [form, postCodeError]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "postCode") {
      setPostCodeError(validatePostCode(value));
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;

    const hasPostCode = !!form.postCode.trim();
    const hasHospital = !!form.hospital;
    const hasCoords = form.lat !== "" && form.lng !== "";

    const dto = { expectedId: form.expectedId.trim() };
    if (hasPostCode) {
      const prefix = getPostcodePrefix();
      const raw = form.postCode.trim();
      dto.postCode = raw.startsWith(prefix) ? raw : `${prefix}${raw}`;
    }
    if (hasHospital) dto.hospital = form.hospital;
    if (hasCoords)
      dto.manualCoordinates = { lat: Number(form.lat), lng: Number(form.lng) };

    setSubmitting(true);
    try {
      const res = await createPendingSample(dto);
      if (res?.ok) {
        toastRef.current?.show({
          severity: "success",
          summary: "Created",
          detail: `Pending sample for '${dto.expectedId}' added.`,
          life: 3000,
        });
        setForm(EMPTY_FORM);
        setPostCodeError("");
      } else {
        const body = await res?.json().catch(() => ({}));
        toastRef.current?.show({
          severity: "error",
          summary: "Error",
          detail: body?.message || "Failed to save pending sample.",
          life: 5000,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowEditComplete = async (e) => {
    const { newData } = e;

    const hasPostCode = !!(newData.postCode ?? "").trim();
    const hasHospital = !!newData.hospital;
    const mc = newData.manualCoordinates;
    const hasCoords =
      mc?.lat != null && mc?.lat !== "" && mc?.lng != null && mc?.lng !== "";

    if (!hasPostCode && !hasHospital && !hasCoords) {
      toastRef.current?.show({
        severity: "warn",
        summary: "Required",
        detail:
          "Fill in at least one geographical field: PostCode, Hospital, or Coordinates.",
        life: 4000,
      });
      return;
    }

    const dto = { expectedId: newData.expectedId };
    if (hasPostCode) {
      const prefix = getPostcodePrefix();
      const raw = (newData.postCode ?? "").trim();
      dto.postCode = raw.startsWith(prefix) ? raw : `${prefix}${raw}`;
    }
    if (hasHospital) dto.hospital = newData.hospital;
    if (hasCoords)
      dto.manualCoordinates = { lat: Number(mc.lat), lng: Number(mc.lng) };

    const res = await updatePendingSample(newData._id, dto);
    if (res?.ok) {
      toastRef.current?.show({
        severity: "success",
        summary: "Updated",
        detail: `Pending sample for '${dto.expectedId}' updated.`,
        life: 3000,
      });
    } else {
      const body = await res?.json().catch(() => ({}));
      toastRef.current?.show({
        severity: "error",
        summary: "Error",
        detail: body?.message || "Failed to update pending sample.",
        life: 5000,
      });
    }
  };

  const handleDelete = async () => {
    if (!confirmRow) return;
    await deletePendingSample(confirmRow._id);
    toastRef.current?.show({
      severity: "success",
      summary: "Deleted",
      detail: `Removed pending sample for '${confirmRow.expectedId}'.`,
      life: 3000,
    });
    setConfirmRow(null);
  };

  const expiresBody = (row) => {
    const d = new Date(row.expiresAt);
    const diff = Math.ceil((d - Date.now()) / 86400000);
    return (
      <span title={d.toLocaleString()}>
        {diff > 0 ? `${diff}d` : "Expired"}
      </span>
    );
  };

  const coordsBody = (row) =>
    row.manualCoordinates
      ? `${row.manualCoordinates.lat}, ${row.manualCoordinates.lng}`
      : "";

  const textEditor = (options) => (
    <InputText
      value={options.value ?? ""}
      onChange={(e) => options.editorCallback(e.target.value)}
      className="w-full"
    />
  );

  const hospitalEditor = (options) =>
    hasHospitalData ? (
      <Dropdown
        value={options.value ?? ""}
        options={hospitalOptions}
        onChange={(e) => options.editorCallback(e.value ?? "")}
        className="w-full"
        filter
        showClear
      />
    ) : (
      <InputText
        value={options.value ?? ""}
        onChange={(e) => options.editorCallback(e.target.value)}
        className="w-full"
      />
    );

  const coordsEditor = (options) => {
    const coords = options.value ?? {};
    return (
      <div className="flex gap-1">
        <InputText
          value={coords.lat ?? ""}
          onChange={(e) =>
            options.editorCallback({ ...coords, lat: e.target.value })
          }
          placeholder="Lat"
          style={{ width: 90 }}
        />
        <InputText
          value={coords.lng ?? ""}
          onChange={(e) =>
            options.editorCallback({ ...coords, lng: e.target.value })
          }
          placeholder="Lng"
          style={{ width: 90 }}
        />
      </div>
    );
  };

  const deleteBody = (row) => (
    <Button
      icon="pi pi-trash"
      className="p-button-text p-button-danger p-button-sm"
      onClick={() => setConfirmRow(row)}
    />
  );

  return (
    <div className="p-4">
      <Toast ref={toastRef} />

      <Dialog
        visible={!!confirmRow}
        onHide={() => setConfirmRow(null)}
        header="Confirm"
        footer={
          <div className="flex gap-2 justify-content-end">
            <Button label="Cancel" text onClick={() => setConfirmRow(null)} />
            <Button label="Delete" severity="danger" onClick={handleDelete} />
          </div>
        }
        style={{ width: 360 }}
      >
        Remove pending sample for &lsquo;{confirmRow?.expectedId}&rsquo;?
      </Dialog>

      <div className="flex align-items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold m-0">Pending Samples</h2>
        <i
          className="pi pi-info-circle cursor-pointer text-500 hover:text-700"
          onClick={() => setShowInfo(true)}
        />
      </div>
      <PendingSamplesInfoDialog
        visible={showInfo}
        onHide={() => setShowInfo(false)}
      />

      <div
        className="surface-card border-1 surface-border border-round p-4 mb-5"
        style={{ maxWidth: 680 }}
      >
        <h3 className="text-base font-semibold mt-0 mb-3">
          Add pending sample
        </h3>
        <div className="formgrid grid">
          <div className="field col-12">
            <label className="block text-sm mb-1">
              Sample ID <span className="text-red-500">*</span>
            </label>
            <InputText
              value={form.expectedId}
              onChange={(e) => handleChange("expectedId", e.target.value)}
              placeholder="e.g. SAMPLE-2026-001"
              className="w-full"
            />
          </div>

          <div className="field col-12">
            <p className="text-sm text-color-secondary mt-0 mb-2">
              Fill in at least one of the following geographical fields.
            </p>
          </div>

          <div className="field col-12 md:col-6">
            <label className="block text-sm mb-1">PostCode</label>
            <InputText
              value={form.postCode}
              onChange={(e) => handleChange("postCode", e.target.value)}
              placeholder="e.g. SE-11122"
              className={`w-full${postCodeError ? " p-invalid" : ""}`}
            />
            {postCodeError && (
              <small className="p-error block mt-1">{postCodeError}</small>
            )}
          </div>

          <div className="field col-12 md:col-6">
            <label className="block text-sm mb-1">Hospital</label>
            {hasHospitalData ? (
              <Dropdown
                value={form.hospital}
                options={hospitalOptions}
                onChange={(e) => handleChange("hospital", e.value ?? "")}
                placeholder="Select hospital"
                className="w-full"
                filter
                showClear
              />
            ) : (
              <InputText
                value={form.hospital}
                onChange={(e) => handleChange("hospital", e.target.value)}
                placeholder="Hospital name"
                className="w-full"
              />
            )}
          </div>

          <div className="field col-12 md:col-6">
            <label className="block text-sm mb-1">Latitude</label>
            <InputText
              value={form.lat}
              onChange={(e) => handleChange("lat", e.target.value)}
              placeholder="e.g. 59.3293"
              className="w-full"
            />
          </div>

          <div className="field col-12 md:col-6">
            <label className="block text-sm mb-1">Longitude</label>
            <InputText
              value={form.lng}
              onChange={(e) => handleChange("lng", e.target.value)}
              placeholder="e.g. 18.0686"
              className="w-full"
            />
          </div>
        </div>

        <Button
          label="Add"
          icon="pi pi-plus"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!isFormValid}
          className="mt-2"
        />
      </div>

      <PendingSamplesBulkUpload
        createPendingSample={createPendingSample}
        toastRef={toastRef}
        pendingSamples={pendingSamples}
        hasHospitalData={hasHospitalData}
      />

      <DataTable
        value={pendingSamples}
        loading={loading}
        emptyMessage="No pending samples."
        stripedRows
        size="small"
        editMode="row"
        onRowEditComplete={handleRowEditComplete}
        dataKey="_id"
      >
        <Column
          field="expectedId"
          header="Sample ID"
          editor={textEditor}
          sortable
        />
        {shownColumns.postCode && (
          <Column field="postCode" header="Post Code" editor={textEditor} />
        )}
        {shownColumns.hospital && (
          <Column field="hospital" header="Hospital" editor={hospitalEditor} />
        )}
        {shownColumns.coordinates && (
          <Column
            field="manualCoordinates"
            header="Coordinates"
            body={coordsBody}
            editor={coordsEditor}
          />
        )}
        <Column
          header="Expires in"
          body={expiresBody}
          sortField="expiresAt"
          sortable
        />
        <Column
          rowEditor
          headerStyle={{ width: "5rem" }}
          bodyStyle={{ textAlign: "center" }}
        />
        <Column header="" body={deleteBody} style={{ width: "3rem" }} />
      </DataTable>
    </div>
  );
}
