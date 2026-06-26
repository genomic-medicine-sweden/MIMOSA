export function formatDate(raw) {
  if (!raw) return "—";
  return new Date(raw).toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
