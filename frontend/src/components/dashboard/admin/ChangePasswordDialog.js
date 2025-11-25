import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";

export default function ChangePasswordDialog({
  visible,
  onHide,
  onSubmit,
  user,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordError,
}) {
  return (
    <Dialog
      header="Change Password"
      visible={visible}
      style={{ width: "25rem" }}
      onHide={onHide}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onHide} className="p-button p-component">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="p-button p-component p-button-success"
          >
            Update
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p>
          Set a new password for: <strong>{user?.email || ""}</strong>
        </p>
        <InputText
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full"
        />
        <InputText
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full"
        />
        {passwordError && (
          <small className="p-error block mt-1">{passwordError}</small>
        )}
      </div>
    </Dialog>
  );
}
