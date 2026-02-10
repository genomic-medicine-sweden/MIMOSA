"use client";

import { useMemo } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

export default function BulkEditDialog({
  visible,
  onHide,
  onConfirm,
  updates,
  errors,
  onAcceptSuggestion,
}) {
  const groupedErrors = useMemo(() => {
    const map = new Map();

    errors.forEach((e) => {
      if (!e.suggestion) return;

      const key = `${e.field}|${e.originalValue}|${e.suggestion}`;

      if (!map.has(key)) {
        map.set(key, {
          field: e.field,
          from: e.originalValue,
          to: e.suggestion,
          count: 0,
        });
      }

      map.get(key).count += 1;
    });

    return Array.from(map.values());
  }, [errors]);

  const unresolvedErrors = groupedErrors.length > 0;

  const hasErrorsWithoutSuggestions =
    errors.length > 0 && groupedErrors.length === 0;

  const unresolvedErrorsList = useMemo(() => {
    return errors.filter((e) => !e.suggestion);
  }, [errors]);

  return (
    <Dialog
      header="Confirm Bulk Update"
      visible={visible}
      style={{ width: "55vw" }}
      onHide={onHide}
      modal
    >
      {groupedErrors.length > 0 && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "0.5rem",
            border: "1px solid #fca5a5",
            backgroundColor: "#fef2f2",
            borderRadius: "4px",
          }}
        >
          <strong>Validation issues:</strong>

          <div style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
            {groupedErrors.map((g) => (
              <div
                key={`${g.field}|${g.from}|${g.to}`}
                style={{ marginBottom: "1.5rem" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <strong>{g.field}</strong>: “{g.from}” Did you mean “
                    <strong>{g.to}</strong>”?
                  </div>

                  <div style={{ whiteSpace: "nowrap" }}>
                    <Button
                      icon="pi pi-check"
                      severity="secondary"
                      text
                      rounded
                      aria-label="Accept"
                      onClick={() => onAcceptSuggestion(g.field, g.from, g.to)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "0.25rem",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  Affects {g.count} sample
                  {g.count > 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasErrorsWithoutSuggestions && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "0.75rem",
            border: "1px solid #fde68a",
            backgroundColor: "#fffbeb",
            borderRadius: "4px",
            fontSize: "0.875rem",
          }}
        >
          <strong>Validation warning:</strong>

          <div style={{ marginTop: "0.5rem" }}>
            The following samples contain values that could not be matched or
            corrected automatically and require manual review:
          </div>

          <ul style={{ marginTop: "0.5rem", marginLeft: "1.25rem" }}>
            {unresolvedErrorsList.map((e, idx) => (
              <li key={`${e.sampleId}-${e.field}-${idx}`}>
                <strong>{e.sampleId}</strong>: {e.field} — “{e.originalValue}”
                <span style={{ color: "#92400e" }}>
                  {" "}
                  (no matching or close value found)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: "0.75rem" }}>
        <strong>{updates.length}</strong> samples will be updated.
      </div>

      <div
        style={{
          fontSize: "0.875rem",
          maxHeight: "15rem",
          overflow: "auto",
          marginBottom: "1rem",
        }}
      >
        {updates.map((u) => (
          <div key={u.sampleId} style={{ marginBottom: "0.75rem" }}>
            <strong>{u.sampleId}</strong>
            <ul style={{ marginLeft: "1.25rem", listStyle: "disc" }}>
              {Object.entries(u.changes).map(([k, v]) => (
                <li key={k}>
                  {k}: {u.original[k] ?? "—"} → {v}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
        }}
      >
        <Button label="Cancel" severity="secondary" onClick={onHide} />
        <Button
          label="Apply Updates"
          severity="secondary"
          disabled={unresolvedErrors || updates.length === 0}
          onClick={onConfirm}
        />
      </div>
    </Dialog>
  );
}
