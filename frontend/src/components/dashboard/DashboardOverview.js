"use client";

import { useMemo, useState } from "react";
import LogsCard from "@/components/dashboard/LogsCard";
import useNotifications from "@/hooks/useNotifications";

const REQUIRED_FIELDS = ["Hospital", "PostCode", "Date"];
const CLUSTER_PREVIEW = 5;

function isIncomplete(sample) {
  return REQUIRED_FIELDS.some((f) => !sample.properties?.[f]?.trim());
}

function formatDate(raw) {
  if (!raw) return "—";
  return new Date(raw).toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardOverview({ data }) {
  const validSamples = useMemo(
    () => data.filter((s) => s.properties?.ID),
    [data],
  );

  const totalSamples = validSamples.length;
  const incompleteSamples = validSamples.filter(isIncomplete).length;

  const totalClusters = useMemo(() => {
    const ids = new Set();
    validSamples.forEach((s) => {
      let cid = s.clusterID || "Unknown";
      if (cid.toLowerCase().startsWith("singleton")) cid = "Singleton";
      const profile = s.properties?.analysis_profile ?? "Unknown";
      ids.add(`${profile}__${cid}`);
    });
    return ids.size;
  }, [validSamples]);

  const clusterIncomplete = useMemo(() => {
    const map = {};
    validSamples.forEach((s) => {
      let cid = s.clusterID || "Unknown";
      if (cid.toLowerCase().startsWith("singleton")) cid = "Singleton";
      const profile = s.properties?.analysis_profile ?? "Unknown";
      const key = `${profile}__${cid}`;
      if (!map[key]) map[key] = { cid, profile, total: 0, incomplete: 0 };
      map[key].total++;
      if (isIncomplete(s)) map[key].incomplete++;
    });
    return Object.values(map)
      .filter((v) => v.incomplete > 0 && v.cid !== "Singleton")
      .sort((a, b) => {
        const profileCmp = a.profile.localeCompare(b.profile);
        if (profileCmp !== 0) return profileCmp;
        return a.cid.localeCompare(b.cid, undefined, { numeric: true });
      });
  }, [validSamples]);

  const incompleteClusters = clusterIncomplete.length;
  const [showAllClusters, setShowAllClusters] = useState(false);
  const visibleClusters = showAllClusters
    ? clusterIncomplete
    : clusterIncomplete.slice(0, CLUSTER_PREVIEW);

  return (
    <div
      style={{
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <KpiCard label="Total samples" value={totalSamples} />
        <KpiCard
          label="Incomplete samples"
          value={incompleteSamples}
          intent={incompleteSamples > 0 ? "warn" : null}
        />
        <KpiCard label="Total clusters" value={totalClusters} />
        <KpiCard
          label="Incomplete clusters"
          value={incompleteClusters}
          intent={incompleteClusters > 0 ? "danger" : null}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
          alignItems: "start",
        }}
      >
        <Card>
          <h2 style={styles.cardTitle}>Incomplete clusters</h2>
          {clusterIncomplete.length === 0 ? (
            <p style={styles.empty}>All clusters have complete data.</p>
          ) : (
            <>
              <table
                style={{
                  width: "100%",
                  fontSize: "13px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                    {[
                      { label: "Cluster", align: "left" },
                      { label: "Profile", align: "left" },
                      { label: "Incomplete", align: "right" },
                      { label: "Total", align: "right" },
                    ].map(({ label, align }) => (
                      <th
                        key={label}
                        style={{ ...styles.th, textAlign: align }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleClusters.map((row) => (
                    <tr
                      key={`${row.profile}__${row.cid}`}
                      style={{ borderBottom: "1px solid #fafafa" }}
                    >
                      <td
                        style={{
                          padding: "0.45rem 0.75rem 0.45rem 0",
                          fontWeight: 500,
                          color: "#1f2937",
                        }}
                      >
                        {row.cid}
                      </td>
                      <td
                        style={{
                          padding: "0.45rem 0.75rem 0.45rem 0",
                          color: "#6b7280",
                          fontSize: "12px",
                        }}
                      >
                        {row.profile.replace(/_/g, " ")}
                      </td>
                      <td
                        style={{
                          padding: "0.45rem 0.75rem",
                          textAlign: "right",
                        }}
                      >
                        <span style={styles.badgeDanger}>{row.incomplete}</span>
                      </td>
                      <td
                        style={{
                          padding: "0.45rem 0",
                          textAlign: "right",
                          color: "#9ca3af",
                        }}
                      >
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clusterIncomplete.length > CLUSTER_PREVIEW && (
                <button
                  onClick={() => setShowAllClusters((v) => !v)}
                  style={styles.expandBtn}
                >
                  {showAllClusters
                    ? "Show less"
                    : `Show ${clusterIncomplete.length - CLUSTER_PREVIEW} more`}
                </button>
              )}
            </>
          )}
        </Card>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <NotificationsCard />
          <LogsCard />
        </div>
      </div>
    </div>
  );
}

function NotificationsCard() {
  const { notifications, loading } = useNotifications();
  const recent = [...(notifications ?? [])]
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    .slice(0, 5);

  return (
    <Card>
      <h2 style={styles.cardTitle}>Notifications</h2>
      {loading ? (
        <p style={styles.empty}>Loading…</p>
      ) : recent.length === 0 ? (
        <p style={styles.empty}>No notifications sent yet.</p>
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
              {[
                { label: "Cluster", align: "left" },
                { label: "Profile", align: "left" },
                { label: "Sent", align: "right" },
              ].map(({ label, align }) => (
                <th key={label} style={{ ...styles.th, textAlign: align }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((n) => (
              <tr key={n._id} style={{ borderBottom: "1px solid #fafafa" }}>
                <td
                  style={{
                    padding: "0.45rem 0.5rem 0.45rem 0",
                    color: "#1f2937",
                    fontWeight: 500,
                  }}
                >
                  <code style={styles.code}>{n.clusterId}</code>
                </td>
                <td
                  style={{
                    padding: "0.45rem 0.5rem",
                    color: "#6b7280",
                    fontSize: "12px",
                  }}
                >
                  {n.analysis_profile?.replace(/_/g, " ") ?? "—"}
                </td>
                <td
                  style={{
                    padding: "0.45rem 0",
                    textAlign: "right",
                    color: "#9ca3af",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(n.sentAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function Card({ children }) {
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
      {children}
    </div>
  );
}

function KpiCard({ label, value, intent }) {
  const valueColor =
    intent === "danger" ? "#b91c1c" : intent === "warn" ? "#d97706" : "#1f2937";
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #f0f0f0",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        padding: "1rem 1.25rem",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          color: "#9ca3af",
          marginBottom: "0.35rem",
          marginTop: 0,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "26px",
          fontWeight: 500,
          color: valueColor,
          lineHeight: 1,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

const styles = {
  cardTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "0.75rem",
    marginTop: 0,
  },
  empty: { fontSize: "13px", color: "#9ca3af", fontStyle: "italic", margin: 0 },
  th: {
    padding: "0 0.5rem 0.5rem 0",
    fontSize: "11px",
    fontWeight: 500,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  badgeDanger: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 500,
    background: "#fef2f2",
    color: "#b91c1c",
  },
  expandBtn: {
    marginTop: "0.75rem",
    fontSize: "12px",
    color: "#6b7280",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
  },
  code: {
    background: "#f3f4f6",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "12px",
    color: "#1f2937",
  },
};
