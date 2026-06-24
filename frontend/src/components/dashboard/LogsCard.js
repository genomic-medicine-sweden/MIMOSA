"use client";
import { useState, useMemo } from "react";
import useAppData from "@/hooks/useAppData";

function pillStyle(active) {
  return {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "4px",
    border: "1px solid",
    cursor: "pointer",
    borderColor: active ? "#6b7280" : "#e5e7eb",
    background: active ? "#f3f4f6" : "white",
    color: active ? "#374151" : "#9ca3af",
  };
}

export default function LogsCard() {
  const { logs } = useAppData();
  const [typeFilter, setTypeFilter] = useState(null);

  const entries = logs.flatMap((log) => {
    if (log.event === "qc_deletion") {
      return [
        {
          sample_id: `${log.deleted_count} samples removed`,
          type: "QC Deletion",
          date: log.added_at,
        },
      ];
    }
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

  const availableTypes = useMemo(
    () => [...new Set(entries.map((e) => e.type))].sort(),
    [entries],
  );

  const recent = (
    typeFilter ? entries.filter((e) => e.type === typeFilter) : entries
  )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const columns = [
    { label: "Date", align: "left" },
    { label: "Type", align: "center" },
    { label: "Sample ID", align: "left" },
  ];

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#374151",
            margin: 0,
          }}
        >
          Recent sample activity
        </h2>

        {availableTypes.length > 1 && (
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              onClick={() => setTypeFilter(null)}
              style={pillStyle(typeFilter === null)}
            >
              All
            </button>
            {availableTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                style={pillStyle(typeFilter === t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

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
              {columns.map(({ label, align }) => (
                <th
                  key={label}
                  style={{
                    padding: "0.4rem 0.5rem 0.4rem 0",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: align,
                  }}
                >
                  {label}
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
                <td
                  style={{
                    padding: "0.4rem 0.5rem 0.4rem 0",
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
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
