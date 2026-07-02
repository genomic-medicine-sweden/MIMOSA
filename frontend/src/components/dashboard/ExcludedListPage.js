"use client";

import React, { useState, useRef } from "react";
import { TabView, TabPanel } from "primereact/tabview";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { Tag } from "primereact/tag";
import useExcludedSamples from "@/hooks/useExcludedSamples";
import useExcludedGroups from "@/hooks/useExcludedGroups";
import useAppData from "@/hooks/useAppData";
import { apiFetch } from "@/utils/apiFetch";
import { formatDate } from "@/utils/date";

export default function ExcludedListPage() {
  const toast = useRef(null);
  const { data } = useAppData();

  const {
    excludedSamples,
    loading: loadingSamples,
    createExcludedSample,
    deleteExcludedSample,
    refresh: refreshSamples,
  } = useExcludedSamples();
  const {
    excludedGroups,
    loading: loadingGroups,
    createExcludedGroup,
    deleteExcludedGroup,
    refresh: refreshGroups,
  } = useExcludedGroups();

  const [newSampleId, setNewSampleId] = useState("");
  const [newGroupId, setNewGroupId] = useState("");

  const [confirmSample, setConfirmSample] = useState(null);
  const [confirmGroup, setConfirmGroup] = useState(null);
  const [offerDelete, setOfferDelete] = useState(null);

  const [selectedSamples, setSelectedSamples] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [confirmBulkSamples, setConfirmBulkSamples] = useState(false);
  const [confirmBulkGroups, setConfirmBulkGroups] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  const handleAddSample = async () => {
    if (!newSampleId.trim()) return;
    const id = newSampleId.trim();
    const res = await createExcludedSample({ sample_id: id });
    if (res?.ok) {
      setNewSampleId("");
      showToast("success", "Added", `Sample ${id} added to exclusion list.`);
      const existsInFeatures = data.some((s) => s.properties?.ID === id);
      if (existsInFeatures) {
        setOfferDelete({ sample_id: id });
      }
    } else if (res?.status === 409) {
      showToast(
        "warn",
        "Already excluded",
        "This sample is already in the exclusion list.",
      );
    } else {
      showToast("error", "Error", "Failed to add sample to exclusion list.");
    }
  };

  const handleOfferDelete = async () => {
    if (!offerDelete) return;
    const { sample_id } = offerDelete;
    setOfferDelete(null);
    const res = await apiFetch(
      `${apiBase}/api/features/${encodeURIComponent(sample_id)}`,
      {
        method: "DELETE",
      },
    );
    if (res?.ok) {
      showToast("success", "Deleted", `${sample_id} removed from MIMOSA.`);
    } else {
      showToast("error", "Delete failed", `Could not delete ${sample_id}.`);
    }
  };

  const handleDeleteSample = async () => {
    if (!confirmSample) return;
    const res = await deleteExcludedSample(confirmSample._id);
    setConfirmSample(null);
    if (res?.ok) {
      setSelectedSamples([]);
      showToast(
        "success",
        "Removed",
        `Sample ${confirmSample.sample_id} removed from exclusion list.`,
      );
    } else {
      showToast("error", "Error", "Failed to remove sample.");
    }
  };

  const handleBulkDeleteSamples = async () => {
    const ids = selectedSamples.map((r) => r._id);
    const res = await apiFetch(`${apiBase}/api/excluded-samples`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setConfirmBulkSamples(false);
    if (res?.ok) {
      setSelectedSamples([]);
      await refreshSamples();
      showToast(
        "success",
        "Removed",
        `${ids.length} sample${ids.length !== 1 ? "s" : ""} removed from exclusion list.`,
      );
    } else {
      showToast("error", "Error", "Failed to remove samples.");
    }
  };

  const handleBulkDeleteGroups = async () => {
    const ids = selectedGroups.map((r) => r._id);
    const res = await apiFetch(`${apiBase}/api/excluded-groups`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setConfirmBulkGroups(false);
    if (res?.ok) {
      setSelectedGroups([]);
      await refreshGroups();
      showToast(
        "success",
        "Removed",
        `${ids.length} group${ids.length !== 1 ? "s" : ""} removed from exclusion list.`,
      );
    } else {
      showToast("error", "Error", "Failed to remove groups.");
    }
  };

  const handleAddGroup = async () => {
    if (!newGroupId.trim()) return;
    const res = await createExcludedGroup({ group_id: newGroupId.trim() });
    if (res?.ok) {
      setNewGroupId("");
      showToast(
        "success",
        "Added",
        `Group ${newGroupId.trim()} added to exclusion list.`,
      );
    } else if (res?.status === 409) {
      showToast(
        "warn",
        "Already excluded",
        "This group is already in the exclusion list.",
      );
    } else {
      showToast("error", "Error", "Failed to add group to exclusion list.");
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirmGroup) return;
    const res = await deleteExcludedGroup(confirmGroup._id);
    setConfirmGroup(null);
    if (res?.ok) {
      setSelectedGroups([]);
      showToast(
        "success",
        "Removed",
        `Group ${confirmGroup.group_id} removed from exclusion list.`,
      );
    } else {
      showToast("error", "Error", "Failed to remove group.");
    }
  };

  const deleteBodySample = (row) => (
    <Button
      icon="pi pi-trash"
      className="p-button-danger p-button-text p-button-sm"
      onClick={() => setConfirmSample(row)}
      tooltip="Remove from exclusion list"
      tooltipOptions={{ position: "left" }}
    />
  );

  const deleteBodyGroup = (row) => (
    <Button
      icon="pi pi-trash"
      className="p-button-danger p-button-text p-button-sm"
      onClick={() => setConfirmGroup(row)}
      tooltip="Remove from exclusion list"
      tooltipOptions={{ position: "left" }}
    />
  );

  return (
    <div className="p-4">
      <Toast ref={toast} />
      <h2 className="text-xl font-bold mb-1">Excluded List</h2>
      <p className="text-sm text-gray-500 mb-4">
        Samples and groups on this list are skipped by the pipeline on every
        run, regardless of source.
      </p>

      <TabView>
        <TabPanel header="Excluded Samples">
          <p className="text-sm text-gray-500 mb-3">
            These sample IDs will not be imported or updated during pipeline
            runs.
          </p>

          <div className="flex gap-2 mb-2 flex-wrap">
            <InputText
              value={newSampleId}
              onChange={(e) => setNewSampleId(e.target.value)}
              placeholder="Sample ID"
              className="flex-1"
              style={{ minWidth: "180px" }}
              onKeyDown={(e) => e.key === "Enter" && handleAddSample()}
            />
            <Button
              label="Add"
              icon="pi pi-plus"
              onClick={handleAddSample}
              disabled={!newSampleId.trim()}
            />
          </div>
          <p className="text-xs text-orange-600 mb-4">
            Samples still present in MIMOSA will continue to appear in
            clustering results until deleted.
          </p>

          {selectedSamples.length > 0 && (
            <div className="flex justify-end mb-2">
              <Button
                label={`Delete selected (${selectedSamples.length})`}
                icon="pi pi-trash"
                severity="danger"
                size="small"
                onClick={() => setConfirmBulkSamples(true)}
              />
            </div>
          )}

          <DataTable
            value={excludedSamples}
            loading={loadingSamples}
            emptyMessage="No excluded samples."
            scrollable
            scrollHeight="420px"
            selection={selectedSamples}
            onSelectionChange={(e) => setSelectedSamples(e.value)}
          >
            <Column selectionMode="multiple" style={{ width: "3rem" }} />
            <Column field="sample_id" header="Sample ID" sortable />
            <Column
              field="added_at"
              header="Added"
              body={(row) => formatDate(row.added_at)}
              sortable
            />
            <Column field="added_by" header="Added By" />
            <Column
              header="Status"
              body={(row) =>
                data.some((s) => s.properties?.ID === row.sample_id) ? (
                  <Tag
                    severity="warning"
                    value="Still in MIMOSA"
                    rounded
                    className="text-xs"
                    style={{ whiteSpace: "nowrap" }}
                  />
                ) : null
              }
              style={{ width: "140px" }}
            />
            <Column body={deleteBodySample} style={{ width: "60px" }} />
          </DataTable>
        </TabPanel>

        <TabPanel header="Excluded Groups (Bonsai)">
          <p className="text-sm text-gray-500 mb-3">
            All samples belonging to these Bonsai group IDs will be skipped
            during pipeline runs.
          </p>

          <div className="flex gap-2 mb-4">
            <InputText
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
              placeholder="Bonsai Group ID"
              className="flex-1"
              style={{ minWidth: "220px" }}
              onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
            />
            <Button
              label="Add"
              icon="pi pi-plus"
              onClick={handleAddGroup}
              disabled={!newGroupId.trim()}
            />
          </div>

          {selectedGroups.length > 0 && (
            <div className="flex justify-end mb-2">
              <Button
                label={`Delete selected (${selectedGroups.length})`}
                icon="pi pi-trash"
                severity="danger"
                size="small"
                onClick={() => setConfirmBulkGroups(true)}
              />
            </div>
          )}

          <DataTable
            value={excludedGroups}
            loading={loadingGroups}
            emptyMessage="No excluded groups."
            scrollable
            scrollHeight="420px"
            selection={selectedGroups}
            onSelectionChange={(e) => setSelectedGroups(e.value)}
          >
            <Column selectionMode="multiple" style={{ width: "3rem" }} />
            <Column field="group_id" header="Group ID" sortable />
            <Column
              field="added_at"
              header="Added"
              body={(row) => formatDate(row.added_at)}
              sortable
            />
            <Column field="added_by" header="Added By" />
            <Column body={deleteBodyGroup} style={{ width: "60px" }} />
          </DataTable>
        </TabPanel>
      </TabView>

      <Dialog
        visible={!!confirmSample}
        onHide={() => setConfirmSample(null)}
        header="Remove from exclusion list"
        style={{ width: "360px" }}
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              label="Cancel"
              className="p-button-text"
              onClick={() => setConfirmSample(null)}
            />
            <Button
              label="Remove"
              className="p-button-danger"
              onClick={handleDeleteSample}
            />
          </div>
        }
      >
        <p>
          Remove <strong>{confirmSample?.sample_id}</strong> from the exclusion
          list? The sample will be eligible for re-import on the next pipeline
          run.
        </p>
      </Dialog>

      <Dialog
        visible={!!confirmGroup}
        onHide={() => setConfirmGroup(null)}
        header="Remove from exclusion list"
        style={{ width: "360px" }}
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              label="Cancel"
              className="p-button-text"
              onClick={() => setConfirmGroup(null)}
            />
            <Button
              label="Remove"
              className="p-button-danger"
              onClick={handleDeleteGroup}
            />
          </div>
        }
      >
        <p>
          Remove group <strong>{confirmGroup?.group_id}</strong> from the
          exclusion list? Samples in this group will be eligible for import on
          the next pipeline run.
        </p>
      </Dialog>

      <Dialog
        visible={confirmBulkSamples}
        onHide={() => setConfirmBulkSamples(false)}
        header="Remove from exclusion list"
        style={{ width: "360px" }}
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              label="Cancel"
              className="p-button-text"
              onClick={() => setConfirmBulkSamples(false)}
            />
            <Button
              label={`Remove ${selectedSamples.length} sample${selectedSamples.length !== 1 ? "s" : ""}`}
              className="p-button-danger"
              onClick={handleBulkDeleteSamples}
            />
          </div>
        }
      >
        <p>
          Remove <strong>{selectedSamples.length}</strong> sample
          {selectedSamples.length !== 1 ? "s" : ""} from the exclusion list?
        </p>
      </Dialog>

      <Dialog
        visible={confirmBulkGroups}
        onHide={() => setConfirmBulkGroups(false)}
        header="Remove from exclusion list"
        style={{ width: "360px" }}
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              label="Cancel"
              className="p-button-text"
              onClick={() => setConfirmBulkGroups(false)}
            />
            <Button
              label={`Remove ${selectedGroups.length} group${selectedGroups.length !== 1 ? "s" : ""}`}
              className="p-button-danger"
              onClick={handleBulkDeleteGroups}
            />
          </div>
        }
      >
        <p>
          Remove <strong>{selectedGroups.length}</strong> group
          {selectedGroups.length !== 1 ? "s" : ""} from the exclusion list?
        </p>
      </Dialog>

      <Dialog
        visible={!!offerDelete}
        onHide={() => setOfferDelete(null)}
        header="Sample still exists in MIMOSA"
        style={{ width: "400px" }}
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              label="Keep in MIMOSA"
              className="p-button-text"
              onClick={() => setOfferDelete(null)}
            />
            <Button
              label="Delete from MIMOSA"
              className="p-button-danger"
              onClick={handleOfferDelete}
            />
          </div>
        }
      >
        <p>
          <strong>{offerDelete?.sample_id}</strong> is still present in MIMOSA
          and will continue to appear in clustering results. Delete it now to
          remove it from all future analyses?
        </p>
      </Dialog>
    </div>
  );
}
