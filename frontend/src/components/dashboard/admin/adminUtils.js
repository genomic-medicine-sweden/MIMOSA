export const fieldMeta = {
  firstName: { label: "First Name" },
  lastName: { label: "Last Name" },
  email: { label: "Email" },
  role: { label: "Role" },
  homeCounty: { label: "Home County" },
};

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const roleEditOptions = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
];

export const generateRoleFilterOptions = (users) =>
  Array.from(new Set(users.map((u) => u.role)))
    .filter(Boolean)
    .map((r) => ({ label: r[0].toUpperCase() + r.slice(1), value: r }));

export const generateCountyFilterOptions = (users) =>
  Array.from(new Set(users.map((u) => u.homeCounty)))
    .filter(Boolean)
    .sort()
    .map((c) => ({ label: c, value: c }));
