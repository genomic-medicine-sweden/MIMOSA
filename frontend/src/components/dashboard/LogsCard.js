"use client";
import useAppData from "@/hooks/useAppData";

export default function LogsCard() {
  const { logs } = useAppData();

  const entries = logs.flatMap((log) => {
    const edits =
      log.updates?.map((update) => ({
        sample_id: log.sample_id,
        type: "Edited",
        date: update.date,
      })) || [];
    return [
      { sample_id: log.sample_id, type: "Added", date: log.added_at },
      ...edits,
    ];
  });

  const recent = entries
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #f0f0f0",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: "1.25rem",
      }}
    >
      <h2
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "0.75rem",
          marginTop: 0,
        }}
      >
        Recent sample activity
      </h2>

      {recent.length === 0 ? (
        <p
          style={{
            fontSize: "13px",
            color: "#9ca3af",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          No recent activity.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            fontSize: "13px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              {["Date", "Type", "Sample ID"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "0 0.5rem 0.5rem 0",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "left",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((entry, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #fafafa" }}>
                <td
                  style={{
                    padding: "0.4rem 0.5rem 0.4rem 0",
                    color: "#6b7280",
                    whiteSpace: "nowrap",
                    fontSize: "12px",
                  }}
                >
                  {new Date(entry.date).toLocaleString("sv-SE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td style={{ padding: "0.4rem 0.5rem", color: "#6b7280" }}>
                  {entry.type}
                </td>
                <td
                  style={{
                    padding: "0.4rem 0",
                    fontWeight: 500,
                    color: "#1f2937",
                  }}
                >
                  {entry.sample_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
