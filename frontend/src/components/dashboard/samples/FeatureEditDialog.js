"use client";

import { Dialog } from "primereact/dialog";

export default function FeatureEditDialog({
  visible,
  onHide,
  onConfirm,
  sampleId,
  originalProperties,
  newProperties,
  fieldFeatures = {},
}) {
  const hasChanges = Object.keys(newProperties || {}).some((key) => {
    const oldVal = originalProperties?.[key];
    const newVal = newProperties?.[key];
    return oldVal !== newVal;
  });

  return (
    <Dialog
      header="Confirm Sample Edit"
      visible={visible}
      style={{ width: "30rem" }}
      onHide={onHide}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onHide} className="p-button p-component">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="p-button p-component p-button-success"
          >
            Confirm
          </button>
        </div>
      }
    >
      <div className="space-y-2 text-sm">
        {sampleId && (
          <p>
            Are you sure you want to make the following changes to{" "}
            <strong>{sampleId}</strong>?
          </p>
        )}

        {hasChanges ? (
          Object.keys(newProperties || {}).map((key) => {
            const oldVal = originalProperties?.[key];
            const newVal = newProperties?.[key];

            const isObject =
              (typeof oldVal === "object" && oldVal !== null) ||
              (typeof newVal === "object" && newVal !== null);

            if (isObject || oldVal === newVal) return null;

            return (
              <div key={key} className="space-y-1">
                <p>
                  <strong>{fieldFeatures[key]?.label || key}:</strong>{" "}
                  <span className="text-gray-500">{oldVal ?? "—"}</span> →{" "}
                  <span className="text-black font-medium">
                    {newVal ?? "—"}
                  </span>
                </p>
              </div>
            );
          })
        ) : (
          <p>No changes detected.</p>
        )}
      </div>
    </Dialog>
  );
}
