"use client";

import React, { useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Skeleton } from "primereact/skeleton";
import { Message } from "primereact/message";
import useNotifications from "@/hooks/useNotifications";

function formatDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  return d.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatProfile(raw) {
  if (!raw) return "—";
  return raw.replace(/_/g, " ");
}

export default function NotificationsPage() {
  const { notifications, loading, error, refresh } = useNotifications();
  const [globalFilter, setGlobalFilter] = useState("");

  const profileBody = (row) => (
    <em style={{ color: "#374151" }}>{formatProfile(row.analysis_profile)}</em>
  );

  const formatCounty = (c) => c.replace(/_/g, " ");

  const countiesBody = (row) => {
    const list = row.counties ?? [];
    if (!list.length) return <span style={{ color: "#9ca3af" }}>—</span>;

    return (
      <span style={{ color: "#374151" }}>
        {list.map(formatCounty).join(", ")}
      </span>
    );
  };
  const sampleCountBody = (row) => row.total ?? row.sampleIds?.length ?? "—";

  const sentAtBody = (row) => (
    <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>
      {formatDate(row.sentAt)}
    </span>
  );

  const clusterIdBody = (row) => (
    <code
      style={{
        background: "#f3f4f6",
        borderRadius: "4px",
        padding: "2px 6px",
        fontSize: "0.8rem",
        color: "#1f2937",
      }}
    >
      {row.clusterId}
    </code>
  );

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height="2.5rem" className="mb-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <Message
          severity="error"
          text={`Could not load notifications: ${error}`}
          style={{ marginBottom: "1rem", width: "100%" }}
        />
        <Button label="Retry" icon="pi pi-refresh" onClick={refresh} outlined />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1 className="text-2xl font-bold mb-2">Notifications</h1>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <span className="p-input-icon-left">
          <InputText
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search notifications…"
            style={{ width: "280px" }}
          />
        </span>
      </div>

      {notifications.length === 0 ? (
        <Message
          severity="info"
          text="No notifications have been sent yet."
          style={{ width: "100%" }}
        />
      ) : (
        <DataTable
          value={notifications}
          dataKey="_id"
          globalFilter={globalFilter}
          globalFilterFields={["clusterId", "analysis_profile", "counties"]}
          tableStyle={{ minWidth: "40rem" }}
          rowHover
          emptyMessage="No notifications match your search."
          pt={{ thead: { style: { backgroundColor: "white" } } }}
        >
          <Column
            field="clusterId"
            header="Cluster ID"
            body={clusterIdBody}
            sortable
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="analysis_profile"
            header="Analysis Profile"
            body={profileBody}
            sortable
            style={{ minWidth: "10rem" }}
          />
          <Column
            field="total"
            header="Samples"
            body={sampleCountBody}
            sortable
            align="center"
            style={{ minWidth: "6rem" }}
            headerStyle={{ minWidth: "6rem" }}
          />
          <Column
            field="counties"
            header="Counties"
            body={countiesBody}
            style={{ minWidth: "14rem" }}
          />
          <Column
            field="sentAt"
            header="Sent At"
            body={sentAtBody}
            sortable
            style={{ minWidth: "10rem" }}
          />
        </DataTable>
      )}
    </div>
  );
}
