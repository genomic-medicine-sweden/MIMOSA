import { Dialog } from "primereact/dialog";

export default function ConfirmEditDialog({
  visible,
  onHide,
  onConfirm,
  originalData,
  newData,
  fieldMeta,
}) {
  const hasChanges = Object.keys(newData || {}).some(
    (key) => originalData?.[key] !== newData?.[key],
  );

  return (
    <Dialog
      header="Confirm Changes"
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
        {originalData?.email && (
          <p>
            Are you sure you want to make the following changes to{" "}
            <strong>{originalData.email}</strong>?
          </p>
        )}

        {hasChanges ? (
          Object.keys(newData || {}).map((key) => {
            const oldVal = originalData?.[key];
            const newVal = newData?.[key];
            if (oldVal !== newVal) {
              return (
                <div key={key} className="space-y-1">
                  <p>
                    <strong>{fieldMeta?.[key]?.label || key}:</strong>{" "}
                    <span className="text-gray-500">{oldVal ?? "-"}</span> →{" "}
                    <span className="text-black font-medium">
                      {newVal ?? "-"}
                    </span>
                  </p>
                </div>
              );
            }
            return null;
          })
        ) : (
          <p>No changes detected.</p>
        )}
      </div>
    </Dialog>
  );
}
