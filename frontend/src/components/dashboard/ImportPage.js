"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { apiFetch } from "@/utils/apiFetch";
import { formatDate } from "@/utils/date";
import { parseTSV, isTsvFile, collectDroppedFiles } from "@/utils/chewbbaca";

const CHIP = {
  skip: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  replace: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  rename: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
};

function ActionChip({ action, label, active, onClick }) {
  const s = CHIP[action];
  return (
    <button
      onClick={onClick}
      style={{
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: active ? 600 : 400,
        border: `1px solid ${active ? s.border : "#e5e7eb"}`,
        background: active ? s.bg : "#fff",
        color: active ? s.color : "#9ca3af",
        cursor: "pointer",
        marginRight: "4px",
      }}
    >
      {label}
    </button>
  );
}

export default function ImportPage() {
  const toastRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsedFiles, setParsedFiles] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [storedProfiles, setStoredProfiles] = useState([]);

  const [resolutions, setResolutions] = useState({});

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [pendingSamples, setPendingSamples] = useState([]);
  const [pendingSearch, setPendingSearch] = useState("");

  const fetchPendingSamples = useCallback(async () => {
    const res = await apiFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/chewbbaca/pending-for-run`,
    );
    if (res?.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setPendingSamples(data);
    }
  }, []);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    apiFetch(`${apiBase}/api/chewbbaca/profiles`).then(async (res) => {
      if (res?.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAvailableProfiles(
            data.map((v) => ({ label: v.replace(/_/g, " "), value: v })),
          );
        }
      }
    });
    fetchPendingSamples();
  }, [fetchPendingSamples]);

  const filteredPending = useMemo(() => {
    const q = pendingSearch.trim().toLowerCase();
    if (!q) return pendingSamples;
    return pendingSamples.filter((s) => s.sample_id.toLowerCase().includes(q));
  }, [pendingSamples, pendingSearch]);

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedPending, setSelectedPending] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [triggeringPipeline, setTriggeringPipeline] = useState(false);

  const allSamples = useMemo(
    () =>
      parsedFiles.flatMap((f) =>
        f.samples.map((s) => ({ ...s, fileName: f.name })),
      ),
    [parsedFiles],
  );

  const storedIdSet = useMemo(
    () => new Set(storedProfiles.map((p) => p.sample_id)),
    [storedProfiles],
  );

  const duplicates = useMemo(
    () => allSamples.filter((s) => storedIdSet.has(s.sample_id)),
    [allSamples, storedIdSet],
  );

  const fetchStored = useCallback(async (p) => {
    if (!p) {
      setStoredProfiles([]);
      return;
    }
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const res = await apiFetch(
        `${apiBase}/api/chewbbaca/allele-profiles?analysis_profile=${p}`,
      );
      if (res?.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setStoredProfiles(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStored(profile);
    setImportResult(null);
  }, [profile, fetchStored]);

  useEffect(() => {
    if (!allSamples.length) return;
    setResolutions((prev) => {
      const next = {};
      allSamples.forEach((s) => {
        next[s.sample_id] =
          prev[s.sample_id] ??
          (storedIdSet.has(s.sample_id)
            ? { action: "skip", newId: s.sample_id }
            : { action: "new", newId: s.sample_id });
      });
      return next;
    });
  }, [allSamples, storedIdSet]);

  const processFiles = useCallback(async (files) => {
    const nextParsed = [];
    const errors = [];
    for (const file of files) {
      if (!isTsvFile(file)) {
        errors.push(`${file.name}: only .tsv files are supported`);
        continue;
      }
      const text = await file.text();
      const out = parseTSV(text);
      if (!out) {
        errors.push(`${file.name}: could not detect sample ID column`);
        continue;
      }
      if (!out.samples.length) {
        errors.push(`${file.name}: no samples found`);
        continue;
      }
      nextParsed.push({ name: file.name, ...out });
    }
    setParsedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...nextParsed.filter((f) => !existing.has(f.name))];
    });
    setParseErrors(errors);
    setImportResult(null);
  }, []);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      setDragOver(false);
      const files = await collectDroppedFiles(e.dataTransfer);
      if (files.length) await processFiles(files);
    },
    [processFiles],
  );

  const handleFileInput = useCallback(
    async (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = "";
      if (files.length) await processFiles(files);
    },
    [processFiles],
  );

  const setAction = (sampleId, action) =>
    setResolutions((prev) => ({
      ...prev,
      [sampleId]: { ...prev[sampleId], action },
    }));

  const setNewId = (sampleId, newId) =>
    setResolutions((prev) => ({
      ...prev,
      [sampleId]: { ...prev[sampleId], newId },
    }));

  const handleImport = async () => {
    if (!parsedFiles.length || !profile) return;
    setImporting(true);

    const samplesToSend = allSamples.flatMap((s) => {
      const res = resolutions[s.sample_id] ?? {
        action: "new",
        newId: s.sample_id,
      };
      if (res.action === "skip") return [];
      if (res.action === "replace")
        return [
          {
            sample_id: s.sample_id,
            alleles: s.alleles,
            action: "replace",
            filename: s.fileName,
          },
        ];
      if (res.action === "rename") {
        const finalId = (res.newId ?? "").trim() || s.sample_id;
        return [
          { sample_id: finalId, alleles: s.alleles, filename: s.fileName },
        ];
      }
      return [
        { sample_id: s.sample_id, alleles: s.alleles, filename: s.fileName },
      ];
    });

    const filename =
      parsedFiles.length === 1
        ? parsedFiles[0].name
        : parsedFiles.map((f) => f.name).join(", ");

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const res = await apiFetch(`${apiBase}/api/chewbbaca/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_profile: profile,
          filename,
          samples: samplesToSend,
        }),
      });
      if (res?.ok) {
        const data = await res.json();
        setImportResult({ ok: true, ...data });
        setParsedFiles([]);
        setResolutions({});
        await Promise.all([fetchStored(profile), fetchPendingSamples()]);
      } else {
        setImportResult({ ok: false, status: res?.status });
      }
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const res = await apiFetch(
        `${apiBase}/api/chewbbaca/allele-profiles/${id}`,
        { method: "DELETE" },
      );
      if (res?.ok) {
        setSelectedPending([]);
        await Promise.all([fetchStored(profile), fetchPendingSamples()]);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleTriggerPipeline = async () => {
    setTriggeringPipeline(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const profiles = [
        ...new Set(
          pendingSamples.map((s) => s.analysis_profile).filter(Boolean),
        ),
      ];
      const res = await apiFetch(`${apiBase}/api/pipeline/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles }),
      });
      if (res?.ok) {
        toastRef.current?.show({
          severity: "success",
          summary: "Pipeline started",
          detail: `Running for: ${profiles.join(", ")}`,
          life: 5000,
        });
        await fetchPendingSamples();
      } else if (res?.status === 409) {
        toastRef.current?.show({
          severity: "warn",
          summary: "Already running",
          detail: "Pipeline is already in progress.",
          life: 4000,
        });
      } else {
        toastRef.current?.show({
          severity: "error",
          summary: "Trigger failed",
          detail: "Could not reach the automation container.",
          life: 4000,
        });
      }
    } catch {
      toastRef.current?.show({
        severity: "error",
        summary: "Trigger failed",
        detail: "Could not reach the automation container.",
        life: 4000,
      });
    } finally {
      setTriggeringPipeline(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedPending.length) return;
    setBulkDeleting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const res = await apiFetch(`${apiBase}/api/chewbbaca/allele-profiles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedPending.map((r) => r._id) }),
      });
      if (res?.ok) {
        setSelectedPending([]);
        await Promise.all([fetchStored(profile), fetchPendingSamples()]);
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    setSavingEdit(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const res = await apiFetch(
        `${apiBase}/api/chewbbaca/allele-profiles/${editingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sample_id: editingName.trim() }),
        },
      );
      if (res?.ok) {
        setEditingId(null);
        await Promise.all([fetchStored(profile), fetchPendingSamples()]);
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const newCount = allSamples.filter(
    (s) => (resolutions[s.sample_id]?.action ?? "new") === "new",
  ).length;
  const toImportCount = allSamples.filter((s) => {
    const a = resolutions[s.sample_id]?.action ?? "new";
    return a !== "skip";
  }).length;

  return (
    <div className="p-4" style={{ maxWidth: "900px" }}>
      <Toast ref={toastRef} position="bottom-right" />
      <h2 className="text-xl font-bold" style={{ marginBottom: "4px" }}>
        Import chewBBACA Data
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        Upload chewBBACA TSV files to store allele typing data for the next
        pipeline run.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".tsv,.txt"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInput}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#3b82f6" : "#d1d5db"}`,
          background: dragOver ? "#eff6ff" : "#f9fafb",
          borderRadius: "8px",
          padding: "2rem 1rem",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: "1.25rem",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <i
          className="pi pi-upload"
          style={{
            fontSize: "1.75rem",
            color: dragOver ? "#3b82f6" : "#9ca3af",
            display: "block",
            marginBottom: "0.5rem",
          }}
        />
        <div style={{ fontWeight: 600, color: "#374151" }}>
          Drag &amp; drop TSV files or folders here
        </div>
        <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
          or click to browse
        </div>
      </div>

      {parseErrors.length > 0 && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#b91c1c",
          }}
        >
          {parseErrors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {parsedFiles.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          {parsedFiles.map((f) => (
            <div
              key={f.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.4rem 0.75rem",
                marginBottom: "4px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                fontSize: "13px",
              }}
            >
              <span style={{ color: "#1d4ed8" }}>
                <strong>{f.name}</strong> &mdash; {f.samples.length} sample
                {f.samples.length !== 1 ? "s" : ""}, {f.loci_count} loci
              </span>
              <button
                onClick={() => {
                  setParsedFiles((p) => p.filter((x) => x.name !== f.name));
                  setImportResult(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: "15px",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#374151",
            marginBottom: "4px",
          }}
        >
          Profile
        </div>
        <Dropdown
          value={profile}
          options={availableProfiles}
          onChange={(e) => setProfile(e.value)}
          placeholder="Select profile"
          style={{ minWidth: "230px" }}
        />
      </div>

      {parsedFiles.length > 0 && profile && duplicates.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "13px",
              color: "#92400e",
              marginBottom: "8px",
            }}
          >
            <i
              className="pi pi-exclamation-triangle"
              style={{ marginRight: "6px" }}
            />
            {duplicates.length} sample{duplicates.length !== 1 ? "s" : ""}{" "}
            already stored — resolve before importing
          </div>
          <div
            style={{
              border: "1px solid #fde68a",
              borderRadius: "6px",
              overflow: "hidden",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: "#fffbeb" }}>
                  <th
                    style={{
                      padding: "6px 10px",
                      textAlign: "left",
                      color: "#78350f",
                      fontWeight: 600,
                    }}
                  >
                    Sample ID
                  </th>
                  <th
                    style={{
                      padding: "6px 10px",
                      textAlign: "left",
                      color: "#78350f",
                      fontWeight: 600,
                    }}
                  >
                    File
                  </th>
                  <th
                    style={{
                      padding: "6px 10px",
                      textAlign: "left",
                      color: "#78350f",
                      fontWeight: 600,
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((s, i) => {
                  const res = resolutions[s.sample_id] ?? {
                    action: "skip",
                    newId: s.sample_id,
                  };
                  return (
                    <tr
                      key={s.sample_id}
                      style={{
                        borderTop: i === 0 ? "none" : "1px solid #fef3c7",
                      }}
                    >
                      <td style={{ padding: "7px 10px", color: "#374151" }}>
                        {s.sample_id}
                      </td>
                      <td style={{ padding: "7px 10px", color: "#6b7280" }}>
                        {s.fileName}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "2px",
                          }}
                        >
                          <ActionChip
                            action="skip"
                            label="Skip"
                            active={res.action === "skip"}
                            onClick={() => setAction(s.sample_id, "skip")}
                          />
                          <ActionChip
                            action="replace"
                            label="Replace"
                            active={res.action === "replace"}
                            onClick={() => setAction(s.sample_id, "replace")}
                          />
                          <ActionChip
                            action="rename"
                            label="Rename"
                            active={res.action === "rename"}
                            onClick={() => setAction(s.sample_id, "rename")}
                          />
                          {res.action === "rename" && (
                            <input
                              value={res.newId ?? s.sample_id}
                              onChange={(e) =>
                                setNewId(s.sample_id, e.target.value)
                              }
                              placeholder="New sample ID"
                              style={{
                                marginLeft: "6px",
                                padding: "2px 7px",
                                border: "1px solid #bfdbfe",
                                borderRadius: "4px",
                                fontSize: "12px",
                                width: "160px",
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {parsedFiles.length > 0 && profile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: "13px", color: "#6b7280" }}>
            {newCount > 0 && (
              <span style={{ color: "#15803d", marginRight: "8px" }}>
                {newCount} new
              </span>
            )}
            {duplicates.filter(
              (s) => resolutions[s.sample_id]?.action === "replace",
            ).length > 0 && (
              <span style={{ color: "#92400e", marginRight: "8px" }}>
                {
                  duplicates.filter(
                    (s) => resolutions[s.sample_id]?.action === "replace",
                  ).length
                }{" "}
                replace
              </span>
            )}
            {duplicates.filter(
              (s) => resolutions[s.sample_id]?.action === "rename",
            ).length > 0 && (
              <span style={{ color: "#1d4ed8", marginRight: "8px" }}>
                {
                  duplicates.filter(
                    (s) => resolutions[s.sample_id]?.action === "rename",
                  ).length
                }{" "}
                rename
              </span>
            )}
            {duplicates.filter(
              (s) => resolutions[s.sample_id]?.action === "skip",
            ).length > 0 && (
              <span style={{ color: "#9ca3af" }}>
                {
                  duplicates.filter(
                    (s) => resolutions[s.sample_id]?.action === "skip",
                  ).length
                }{" "}
                skip
              </span>
            )}
          </div>
          {toImportCount === 0 ? (
            <Button
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              onClick={() => {
                setParsedFiles([]);
                setResolutions({});
                setImportResult(null);
              }}
            />
          ) : (
            <Button
              label={
                importing
                  ? "Importing…"
                  : `Import ${toImportCount} sample${toImportCount !== 1 ? "s" : ""}`
              }
              icon={importing ? "pi pi-spin pi-spinner" : "pi pi-check"}
              onClick={handleImport}
              disabled={importing}
            />
          )}
        </div>
      )}

      {importResult && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "0.875rem 1rem",
            background: importResult.ok ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${importResult.ok ? "#bbf7d0" : "#fecaca"}`,
            borderRadius: "6px",
          }}
        >
          {importResult.ok ? (
            <>
              <div
                style={{
                  fontWeight: 600,
                  color: "#15803d",
                  marginBottom: "3px",
                }}
              >
                Import complete
              </div>
              <div style={{ fontSize: "13px", color: "#166534" }}>
                {importResult.imported} imported &nbsp;&middot;&nbsp;
                {importResult.updated} updated &nbsp;&middot;&nbsp;
                {importResult.skipped} skipped
              </div>
            </>
          ) : (
            <div style={{ color: "#b91c1c", fontSize: "13px" }}>
              {importResult.status === 413
                ? "Import failed: payload too large. Try splitting the file into smaller batches."
                : "Import failed. Please try again."}
            </div>
          )}
        </div>
      )}

      <div style={{ borderTop: "1px solid #e5e7eb", margin: "1.5rem 0" }} />

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <h3 style={{ fontWeight: 600, fontSize: "15px", color: "#111827" }}>
            Pending for next run
            {pendingSamples.length > 0 && (
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "12px",
                  fontWeight: 400,
                  color: "#6b7280",
                }}
              >
                {pendingSamples.length} stored
              </span>
            )}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {selectedPending.length > 0 && (
              <Button
                label={
                  bulkDeleting
                    ? "Deleting…"
                    : `Delete (${selectedPending.length})`
                }
                icon={bulkDeleting ? "pi pi-spin pi-spinner" : "pi pi-trash"}
                severity="danger"
                size="small"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
              />
            )}
            {pendingSamples.length > 0 && (
              <Button
                label={triggeringPipeline ? "Starting…" : "Run pipeline"}
                icon={
                  triggeringPipeline ? "pi pi-spin pi-spinner" : "pi pi-play"
                }
                size="small"
                onClick={handleTriggerPipeline}
                disabled={triggeringPipeline}
              />
            )}
            {pendingSamples.length > 0 && (
              <input
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                placeholder="Search by sample ID…"
                style={{
                  padding: "4px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                  width: "220px",
                }}
              />
            )}
          </div>
        </div>

        {pendingSamples.length === 0 ? (
          <div style={{ fontSize: "13px", color: "#9ca3af" }}>
            No pending samples.
          </div>
        ) : (
          <DataTable
            value={filteredPending}
            selection={selectedPending}
            onSelectionChange={(e) => setSelectedPending(e.value)}
            paginator
            rows={20}
            scrollable
            scrollHeight="400px"
            size="small"
          >
            <Column selectionMode="multiple" style={{ width: "3rem" }} />
            <Column
              header="Sample ID"
              body={(row) =>
                editingId === row._id ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      style={{
                        padding: "2px 6px",
                        border: "1px solid #93c5fd",
                        borderRadius: "4px",
                        fontSize: "12px",
                        width: "160px",
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#2563eb",
                        fontSize: "12px",
                      }}
                    >
                      {savingEdit ? "…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#9ca3af",
                        fontSize: "12px",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ color: "#111827" }}>{row.sample_id}</span>
                    <button
                      onClick={() => {
                        setEditingId(row._id);
                        setEditingName(row.sample_id);
                      }}
                      title="Rename"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#d1d5db",
                        padding: "1px 3px",
                        lineHeight: 1,
                      }}
                    >
                      <i
                        className="pi pi-pencil"
                        style={{ fontSize: "11px" }}
                      />
                    </button>
                  </div>
                )
              }
            />
            <Column
              field="analysis_profile"
              header="Profile"
              body={(row) => (
                <span style={{ color: "#6b7280", fontSize: "12px" }}>
                  {row.analysis_profile?.replace(/_/g, " ")}
                </span>
              )}
            />
            <Column
              field="filename"
              header="File"
              body={(row) => (
                <span style={{ color: "#6b7280" }}>{row.filename || "—"}</span>
              )}
            />
            <Column
              field="imported_at"
              header="Imported"
              body={(row) => (
                <span style={{ color: "#6b7280" }}>
                  {formatDate(row.imported_at)}
                </span>
              )}
            />
            <Column
              header=""
              body={(row) => (
                <button
                  onClick={() => handleDelete(row._id)}
                  disabled={deletingId === row._id}
                  title="Remove"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: deletingId === row._id ? "#d1d5db" : "#ef4444",
                    fontSize: "13px",
                    padding: "2px 4px",
                  }}
                >
                  <i className="pi pi-trash" />
                </button>
              )}
              style={{ width: "40px" }}
            />
          </DataTable>
        )}
      </div>
    </div>
  );
}
