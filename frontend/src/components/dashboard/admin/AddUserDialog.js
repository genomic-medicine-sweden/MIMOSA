import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { FloatLabel } from "primereact/floatlabel";

export default function AddUserDialog({
  visible,
  onHide,
  onSubmit,
  user,
  setUser,
  emailError,
  setEmailError,
  roleOptions,
  countyOptions,
  disabled,
}) {
  return (
    <Dialog
      header="Add New User"
      visible={visible}
      style={{ width: "30rem" }}
      onHide={onHide}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onHide} className="p-button p-component">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="p-button p-component p-button-success"
            disabled={disabled}
          >
            Add User
          </button>
        </div>
      }
    >
      <div className="p-fluid formgrid grid">
        <div className="field col-12">
          <InputText
            placeholder="Email"
            value={user.email}
            onChange={(e) => {
              setUser({ ...user, email: e.target.value });
              setEmailError("");
            }}
            className={emailError ? "p-invalid" : ""}
          />
          {emailError && <small className="p-error">{emailError}</small>}
        </div>

        <div className="field col-6">
          <InputText
            placeholder="First Name"
            value={user.firstName}
            onChange={(e) => setUser({ ...user, firstName: e.target.value })}
          />
        </div>

        <div className="field col-6">
          <InputText
            placeholder="Last Name"
            value={user.lastName}
            onChange={(e) => setUser({ ...user, lastName: e.target.value })}
          />
        </div>

        <div className="field col-12 mt-2">
          <FloatLabel>
            <Dropdown
              id="Role"
              value={user.role}
              options={roleOptions}
              onChange={(e) => setUser({ ...user, role: e.value })}
              placeholder="Select Role"
            />
            <label htmlFor="Role">Role</label>
          </FloatLabel>
        </div>

        <div className="field col-12">
          <Dropdown
            value={user.homeCounty}
            options={countyOptions}
            onChange={(e) => setUser({ ...user, homeCounty: e.value })}
            placeholder="Select County"
          />
        </div>

        <div className="field col-6">
          <InputText
            type="password"
            placeholder="Password"
            value={user.password}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
          />
        </div>

        <div className="field col-6">
          <InputText
            type="password"
            placeholder="Confirm Password"
            value={user.confirmPassword}
            onChange={(e) =>
              setUser({ ...user, confirmPassword: e.target.value })
            }
            className={
              user.confirmPassword && user.password !== user.confirmPassword
                ? "p-invalid"
                : ""
            }
          />
        </div>

        {user.confirmPassword && user.password !== user.confirmPassword && (
          <div className="field col-12">
            <small className="p-error">Passwords do not match.</small>
          </div>
        )}
      </div>
    </Dialog>
  );
}
