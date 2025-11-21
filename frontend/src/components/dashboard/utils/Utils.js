import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";

export const handleTextFilterChange = (setFilters) => (field) => (e) => {
  setFilters((prev) => ({
    ...prev,
    [field]: { ...prev[field], value: e.target.value },
  }));
};

export const handleDropdownFilterChange = (setFilters) => (field) => (e) => {
  setFilters((prev) => ({
    ...prev,
    [field]: { ...prev[field], value: e.value },
  }));
};

export const renderTextFilter = (filters, field, placeholder, handleChange) => (
  <InputText
    value={filters[field]?.value || ""}
    onChange={handleChange(field)}
    placeholder={placeholder}
    className="p-column-filter"
    clearable="true"
  />
);

export const renderDropdownFilter = (
  filters,
  field,
  placeholder,
  optionsList,
  handleChange,
) => (
  <Dropdown
    value={filters[field]?.value ?? null}
    options={optionsList}
    onChange={handleChange(field)}
    placeholder={placeholder}
    className="p-column-filter w-full"
    showClear
  />
);

export const getInitialFilterState = (fields, matchModeOverrides = {}) => {
  return fields.reduce((acc, field) => {
    acc[field] = {
      value: "",
      matchMode:
        matchModeOverrides[field] ||
        (field.toLowerCase().includes("id") ||
        field.toLowerCase().includes("date") ||
        field.toLowerCase().includes("name") ||
        field.toLowerCase().includes("email")
          ? "contains"
          : "equals"),
    };
    return acc;
  }, {});
};

export const toast = {
  success: (toastRef, summary, detail, life = 3000) =>
    toastRef.current?.show({
      severity: "success",
      summary,
      detail,
      life,
    }),

  error: (toastRef, summary, detail, life = 4000) =>
    toastRef.current?.show({
      severity: "error",
      summary,
      detail,
      life,
    }),

  warn: (toastRef, summary, detail, life = 3000) =>
    toastRef.current?.show({
      severity: "warn",
      summary,
      detail,
      life,
    }),
};
