import { Dialog } from "primereact/dialog";

export default function DeleteUserDialog({ visible, onHide, onConfirm, user }) {
  const isAutomation = user?.role === "automation";
  const identifier = user?.email || user?.username;

  return (
    <Dialog
      header="Confirm Deletion"
      visible={visible}
      style={{ width: "25rem" }}
      onHide={onHide}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onHide} className="p-button p-component">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="p-button p-component p-button-danger"
          >
            Delete
          </button>
        </div>
      }
    >
      {user && (
        <div className="space-y-2">
          <p>
            Are you sure you want to delete? <br />
            <strong>{identifier}</strong>
          </p>
          {isAutomation && (
            <small className="block text-orange-500">
              This is an automation account. After deletion, the automation
              service will fail to authenticate.
            </small>
          )}
        </div>
      )}
    </Dialog>
  );
}
