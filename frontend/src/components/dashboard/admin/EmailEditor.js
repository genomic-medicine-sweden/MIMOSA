import { useState, useEffect } from "react";
import { InputText } from "primereact/inputtext";
import { emailRegex } from "./adminUtils";

export default function EmailEditor({
  options,
  users,
  editingOriginalData,
  emailDrafts,
  setEmailDrafts,
  emailErrors,
  setEmailErrors,
}) {
  const rowKey = editingOriginalData?.email ?? options.rowData.email;

  const [value, setValue] = useState(options.value);
  const [error, setError] = useState("");

  useEffect(() => setValue(options.value), [options.value]);

  const validate = (val) => {
    if (!emailRegex.test(val)) {
      return "Invalid email format.";
    }
    if (
      users.some(
        (u) => u.email === val && u.email !== editingOriginalData?.email,
      )
    ) {
      return "Email already in use.";
    }
    return "";
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);

    setEmailDrafts?.((prev) => ({
      ...prev,
      [rowKey]: val,
    }));

    const err = validate(val);
    setError(err);
    setEmailErrors?.((prev) => ({
      ...prev,
      [rowKey]: err,
    }));

    options.editorCallback(val.trim());
  };

  const handleBlur = () => {
    const err = validate(value);
    setError(err);
    setEmailErrors?.((prev) => ({ ...prev, [rowKey]: err }));
  };

  return (
    <div className="w-full">
      <InputText
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-full ${error ? "p-invalid" : ""}`}
      />
      {error && <small className="p-error block mt-1">{error}</small>}
    </div>
  );
}
