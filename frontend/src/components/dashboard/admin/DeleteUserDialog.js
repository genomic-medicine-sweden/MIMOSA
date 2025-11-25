import { Dialog } from "primereact/dialog";

export default function DeleteUserDialog({ visible, onHide, onConfirm, user }) {
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
        <p>
          Are you sure you want to delete? <br />
          <strong>{user.email}</strong>
        </p>
      )}
    </Dialog>
  );
}
