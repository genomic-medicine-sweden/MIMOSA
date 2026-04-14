import React, { useState } from "react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";

const OutbreakAlert = ({ outbreaks }) => {
  const [isMinimised, setIsMinimised] = useState(false);

  const hasOutbreaks = Array.isArray(outbreaks) && outbreaks.length > 0;
  if (!hasOutbreaks) {
    return (
      <Button
        icon="pi pi-exclamation-triangle"
        className="p-button-secondary p-button-rounded"
        tooltip="No active outbreaks"
      />
    );
  }

  if (isMinimised) {
    return (
      <Button
        icon="pi pi-exclamation-triangle"
        className="p-button-danger p-button-rounded"
        onClick={() => setIsMinimised(false)}
        tooltip="Show outbreak details"
      />
    );
  }

  return (
    <Card
      className="p-card-danger"
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      pt={{
        body: {
          style: {
            padding: "0.5rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          },
        },
        content: {
          style: {
            padding: 0,
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
      header={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.35rem 0.75rem",
          }}
        >
          <span style={{ fontWeight: "bold", color: "#b00020" }}>
            Outbreak Alert
          </span>
          <Button
            icon="pi pi-window-minimize"
            className="p-button-text p-button-sm"
            onClick={() => setIsMinimised(true)}
          />
        </div>
      }
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        {outbreaks.map((cluster) => (
          <div
            key={cluster.clusterId}
            style={{ marginBottom: "0.5rem", lineHeight: 1.3 }}
          >
            {cluster.summary || (
              <>
                <strong>Cluster {cluster.clusterId}</strong> — {cluster.total}{" "}
                case
                {cluster.total !== 1 ? "s" : ""} in{" "}
                {cluster.counties.map((c, i) => (
                  <span key={i}>
                    {typeof c === "string" ? c : c.county}
                    {i < cluster.counties.length - 1 ? ", " : ""}
                  </span>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default OutbreakAlert;
