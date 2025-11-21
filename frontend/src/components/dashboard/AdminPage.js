"use client";

import { useState, useRef, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ProgressSpinner } from "primereact/progressspinner";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";

import useCurrentUser from "@/hooks/useCurrentUser";
import useUserManagement from "@/hooks/useUserManagement";
import {
  fieldMeta,
  emailRegex,
  roleEditOptions,
  countyEditOptions,
  generateRoleFilterOptions,
  generateCountyFilterOptions,
} from "./admin/adminUtils";

import {
  handleTextFilterChange,
  handleDropdownFilterChange,
  renderTextFilter,
  renderDropdownFilter,
  getInitialFilterState,
  toast,
} from "./utils/Utils";

import EmailEditor from "./admin/EmailEditor";
import AddUserDialog from "./admin/AddUserDialog";
import ConfirmEditDialog from "./admin/ConfirmEditDialog";
import DeleteUserDialog from "./admin/DeleteUserDialog";
import ChangePasswordDialog from "./admin/ChangePasswordDialog";

export default function AdminPage() {
  const currentUser = useCurrentUser();

  const {
    users,
    loading,
    createUser,
    updateUser,
    deleteUser: deleteUserApi,
    updatePassword,
  } = useUserManagement();

  const [filters, setFilters] = useState(
    getInitialFilterState([
      "firstName",
      "lastName",
      "email",
      "role",
      "homeCounty",
    ]),
  );

  const [editingOriginalData, setEditingOriginalData] = useState(null);
  const [pendingEditData, setPendingEditData] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [emailErrors, setEmailErrors] = useState({});
  const [emailDrafts, setEmailDrafts] = useState({});

  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserEmailError, setNewUserEmailError] = useState("");
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "user",
    homeCounty: "",
    password: "",
    confirmPassword: "",
  });

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [userToUpdatePassword, setUserToUpdatePassword] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const toastRef = useRef(null);

  const roleFilterOptions = generateRoleFilterOptions(users);
  const countyFilterOptions = generateCountyFilterOptions(users);

  const handleTextFilterChange = (field) => (e) => {
    setFilters((prev) => ({
      ...prev,
      [field]: { ...prev[field], value: e.target.value },
    }));
  };

  const handleDropdownFilterChange = (field) => (e) => {
    setFilters((prev) => ({
      ...prev,
      [field]: { ...prev[field], value: e.value },
    }));
  };

  const renderTextFilter = (field, placeholder) => (
    <InputText
      value={filters[field]?.value || ""}
      onChange={handleTextFilterChange(field)}
      placeholder={placeholder}
      className="p-column-filter"
      clearable="true"
    />
  );

  const renderDropdownFilter = (field, placeholder, optionsList) => (
    <Dropdown
      value={filters[field]?.value ?? null}
      options={optionsList}
      onChange={handleDropdownFilterChange(field)}
      placeholder={placeholder}
      className="p-column-filter w-full"
      showClear
    />
  );

  const emailEditor = useCallback(
    (options) => (
      <EmailEditor
        options={options}
        emailDrafts={emailDrafts}
        setEmailDrafts={setEmailDrafts}
        emailErrors={emailErrors}
        setEmailErrors={setEmailErrors}
        editingOriginalData={editingOriginalData}
        users={users}
      />
    ),
    [emailDrafts, emailErrors, users, editingOriginalData],
  );

  const textEditor = (options) => (
    <InputText
      value={options.value}
      onChange={(e) => options.editorCallback(e.target.value)}
      className="w-full"
    />
  );

  const dropdownEditor = (options, optionList) => (
    <Dropdown
      value={options.value}
      options={optionList}
      onChange={(e) => options.editorCallback(e.value)}
      placeholder="Select"
      className="w-full"
    />
  );

  const onRowEditInit = (e) => {
    setEditingOriginalData({ ...users[e.index] });
  };

  const onRowEditComplete = (e) => {
    const { newData, index } = e;
    const originalEmail = editingOriginalData?.email;
    const newEmail = (emailDrafts[index] ?? newData.email)?.trim();

    if (newEmail !== originalEmail) {
      if (!emailRegex.test(newEmail)) {
        setEmailErrors((prev) => ({
          ...prev,
          [index]: "Invalid email format.",
        }));
        throw new Error("Email validation failed");
      } else if (
        users.some((u) => u.email === newEmail && u.email !== originalEmail)
      ) {
        setEmailErrors((prev) => ({
          ...prev,
          [index]: "Email already in use.",
        }));
        throw new Error("Email already exists");
      } else {
        setEmailErrors((prev) => {
          const { [index]: _, ...rest } = prev;
          return rest;
        });
        newData.email = newEmail;
      }
    }

    const hasChanges = Object.keys(newData).some(
      (key) => editingOriginalData?.[key] !== newData[key],
    );

    if (hasChanges) {
      setPendingEditData({ newData, index });
      setShowConfirmDialog(true);
    }
  };
  const confirmChanges = async () => {
    const { newData, index } = pendingEditData;
    const updateFields = { ...newData };
    if (newData.email !== editingOriginalData.email) {
      updateFields.newEmail = newData.email;
    }
    delete updateFields.email;

    try {
      await updateUser(editingOriginalData.email, updateFields, index);

      toast.success(
        toastRef,
        "Success",
        `${editingOriginalData.email} has been updated.`,
      );
    } catch (err) {
      console.error("Update failed:", err);
      toast.error(
        toastRef,
        "Update Failed",
        err?.message || "User update failed.",
      );
    } finally {
      setShowConfirmDialog(false);
      setEditingOriginalData(null);
      setPendingEditData(null);
    }
  };

  const onRowEditCancel = (e) => {
    const index = e.index;
    setEmailDrafts((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    setEmailErrors((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
    setEditingOriginalData(null);
  };

  const resetAllFilters = () => {
    setFilters(
      getInitialFilterState([
        "firstName",
        "lastName",
        "email",
        "role",
        "homeCounty",
      ]),
    );
  };

  const deleteUser = async () => {
    try {
      await deleteUserApi(userToDelete.email);

      toast.success(
        toastRef,
        "User Deleted",
        `${userToDelete.email} has been removed.`,
      );
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(
        toastRef,
        "Delete Failed",
        err?.message || "Could not delete user.",
      );
    } finally {
      setShowDeleteDialog(false);
      setUserToDelete(null);
    }
  };

  const addUser = async () => {
    setNewUserEmailError("");

    if (!emailRegex.test(newUser.email)) {
      setNewUserEmailError("Invalid email format.");
      return;
    }

    if (users.some((u) => u.email === newUser.email)) {
      setNewUserEmailError("Email already in use.");
      return;
    }

    if (!newUser.password.trim()) {
      toast.warn(toastRef, "Missing password", "Password is required");
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      toast.warn(
        toastRef,
        "Passowrd mismatch",
        "Password and confirmation do not match",
      );
      return;
    }
    try {
      const createdUser = await createUser(newUser);

      setNewUser({
        firstName: "",
        lastName: "",
        email: "",
        role: "",
        homeCounty: "",
        password: "",
        confirmPassword: "",
      });
      setShowAddUserForm(false);
      setNewUserEmailError("");

      toast.success(
        toastRef,
        "User Added",
        "New user has been successfully added.",
      );
    } catch (err) {
      console.error("Failed to add user:", err);
      toast.error(
        toastRef,
        "Add failed",
        err?.message || "Failed to add user.",
      );
    }
  };

  const isAddUserDisabled =
    !newUser.firstName.trim() ||
    !newUser.lastName.trim() ||
    !newUser.email.trim() ||
    !newUser.role ||
    !newUser.homeCounty ||
    !newUser.password ||
    !newUser.confirmPassword ||
    newUser.password !== newUser.confirmPassword;

  const handleChangePassword = async () => {
    setPasswordError("");

    if (!newPassword || !confirmPassword) {
      setPasswordError("Both password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      await updatePassword(userToUpdatePassword.email, newPassword);
      toast.success(
        toastRef,
        "Password updated",
        `Password updated for ${userToUpdatePassword.email}`,
      );

      setShowPasswordDialog(false);
      setUserToUpdatePassword(null);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    } catch (err) {
      console.error("Failed to update password:", err);
      setPasswordError(err?.message || "Failed to update password.");
    }
  };

  if (!currentUser || loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <ProgressSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 w-full">
      <div className="mb-1">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      <Toast ref={toastRef} position="bottom-right" />

      <div className="w-full flex mb-3">
        <button
          onClick={resetAllFilters}
          className="ml-auto flex items-center gap-2 text-sm text-blue-800 hover:text-blue-600 bg-white border-none px-3 py-1 rounded focus:outline-none transition-colors"
        >
          <span>Reset All Filters</span>
          <i className="pi pi-filter-slash"></i>
        </button>
      </div>
      <style>{`
        .p-datatable .p-datatable-thead > tr:first-child > th {
          background-color: white !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      <DataTable
        value={users}
        scrollable
        style={{ minWidth: "50rem" }}
        scrollHeight="350px"
        loading={loading}
        filterDisplay="row"
        filters={filters}
        onFilter={(e) => setFilters(e.filters)}
        emptyMessage="No users found."
        className="p-datatable-sm"
        editMode="row"
        onRowEditInit={(e) => setEditingOriginalData({ ...users[e.index] })}
        onRowEditComplete={onRowEditComplete}
        onRowEditCancel={onRowEditCancel}
        rowEditValidator={(row) => {
          const originalEmail = editingOriginalData?.email ?? row.email;
          const draftEmail =
            (emailDrafts[originalEmail] ?? row.email)?.trim() ?? "";

          const emailChanged = draftEmail !== originalEmail;

          if (emailChanged) {
            const error = emailErrors[originalEmail] ?? "";
            return (
              emailRegex.test(draftEmail) &&
              !users.some(
                (u) => u.email === draftEmail && u.email !== originalEmail,
              ) &&
              !error
            );
          }

          return true;
        }}
      >
        <Column
          field="email"
          editor={emailEditor}
          filter
          filterElement={renderTextFilter("email", fieldMeta.email.label)}
          showFilterMenu={false}
          filterMatchMode="contains"
          style={{ minWidth: "14rem" }}
        />
        <Column
          field="firstName"
          editor={textEditor}
          filter
          filterElement={renderTextFilter(
            "firstName",
            fieldMeta.firstName.label,
          )}
          showFilterMenu={false}
          filterMatchMode="contains"
          style={{ minWidth: "10rem" }}
        />
        <Column
          field="lastName"
          editor={textEditor}
          filter
          filterElement={renderTextFilter("lastName", fieldMeta.lastName.label)}
          showFilterMenu={false}
          filterMatchMode="contains"
          style={{ minWidth: "10rem" }}
        />
        <Column
          field="role"
          editor={(options) => dropdownEditor(options, roleEditOptions)}
          filter
          filterElement={renderDropdownFilter(
            "role",
            fieldMeta.role.label,
            roleFilterOptions,
          )}
          showFilterMenu={false}
          filterMatchMode="equals"
          style={{ minWidth: "10rem" }}
        />
        <Column
          field="homeCounty"
          editor={(options) => dropdownEditor(options, countyEditOptions)}
          filter
          filterElement={renderDropdownFilter(
            "homeCounty",
            fieldMeta.homeCounty.label,
            countyFilterOptions,
          )}
          showFilterMenu={false}
          filterMatchMode="equals"
          style={{ minWidth: "12rem" }}
        />

        <Column
          rowEditor
          headerStyle={{ width: "5rem" }}
          bodyStyle={{ textAlign: "center" }}
        />
        <Column
          body={(rowData) => (
            <button
              onClick={() => {
                setUserToUpdatePassword(rowData);
                setShowPasswordDialog(true);
                setNewPassword("");
                setConfirmPassword("");
                setPasswordError("");
              }}
              className="p-button p-component p-button-text p-button-secondary p-button-sm"
            >
              <i className="pi pi-key mr-1" />
            </button>
          )}
          style={{ width: "6rem", textAlign: "center" }}
        />
        <Column
          body={(rowData) =>
            rowData.email !== currentUser.email ? (
              <button
                onClick={() => {
                  setUserToDelete(rowData);
                  setShowDeleteDialog(true);
                }}
                className="p-button p-component p-button-text p-button-danger p-button-sm"
              >
                <i className="pi pi-trash" />
              </button>
            ) : null
          }
          style={{ width: "4rem", textAlign: "center" }}
        />
      </DataTable>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowAddUserForm(true)}
          className="p-button p-component p-button-outlined"
        >
          <i className="pi pi-user-plus mr-2" />
          Add User
        </button>
      </div>

      <AddUserDialog
        visible={showAddUserForm}
        onHide={() => setShowAddUserForm(false)}
        onSubmit={addUser}
        user={newUser}
        setUser={setNewUser}
        emailError={newUserEmailError}
        setEmailError={setNewUserEmailError}
        roleOptions={roleEditOptions}
        countyOptions={countyEditOptions}
        disabled={isAddUserDisabled}
      />
      <ConfirmEditDialog
        visible={showConfirmDialog}
        onHide={() => setShowConfirmDialog(false)}
        onConfirm={confirmChanges}
        originalData={editingOriginalData}
        newData={pendingEditData?.newData}
        fieldMeta={fieldMeta}
      />
      <DeleteUserDialog
        visible={showDeleteDialog}
        onHide={() => setShowDeleteDialog(false)}
        onConfirm={deleteUser}
        user={userToDelete}
      />
      <ChangePasswordDialog
        visible={showPasswordDialog}
        onHide={() => {
          setShowPasswordDialog(false);
          setUserToUpdatePassword(null);
          setNewPassword("");
          setConfirmPassword("");
          setPasswordError("");
        }}
        onSubmit={handleChangePassword}
        user={userToUpdatePassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        passwordError={passwordError}
      />
    </div>
  );
}
