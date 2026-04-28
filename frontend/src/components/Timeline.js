import React, { useState, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { getColor } from "@/utils/ColorAssignment";
import { SelectButton } from "primereact/selectbutton";
import { Button } from "primereact/button";
import { Tooltip as PrimeTooltip } from "primereact/tooltip";
import "primeicons/primeicons.css";
import { exportTimelineImage } from "@/utils/TimelineExport";
import StackedClusterBar from "@/components/charts/StackedClusterBar";

Chart.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
);

const GROUPING_OPTIONS = [
  { label: "Year", value: "year" },
  { label: "Year-Month", value: "year-month" },
  { label: "Date", value: "date" },
];

function groupDataBy(data, groupingType) {
  const grouped = {};
  data.forEach((item) => {
    let date;
    if (groupingType === "year") {
      date = item.properties.Date.slice(0, 4);
    } else if (groupingType === "year-month") {
      date = item.properties.Date.slice(0, 7);
    } else {
      date = item.properties.Date;
    }

    let clusterID = item.properties.Cluster_ID;
    if (clusterID.toLowerCase().includes("singleton")) clusterID = "Singleton";

    if (!grouped[date]) grouped[date] = {};
    grouped[date][clusterID] = (grouped[date][clusterID] ?? 0) + 1;
  });
  return grouped;
}

const Timeline = ({ filteredData }) => {
  const [grouping, setGrouping] = useState("date");
  const [chartType, setChartType] = useState("bar");
  const chartRef = useRef(null);

  useEffect(() => {
    setGrouping("date");
  }, []);

  const datedData = filteredData.filter(
    (item) => !!item.properties.Date?.trim(),
  );
  const missingDateCount = filteredData.length - datedData.length;

  const dataByDate = groupDataBy(datedData, grouping);
  const labels = Object.keys(dataByDate).sort();

  const uniqueClusterIDs = [
    ...new Set(
      datedData.map((item) => {
        const cid = item.properties.Cluster_ID;
        return cid.toLowerCase().includes("singleton") ? "Singleton" : cid;
      }),
    ),
  ];

  const datasets = uniqueClusterIDs.map((clusterID) => {
    const match = datedData.find((item) => {
      const cid = item.properties.Cluster_ID;
      return clusterID === "Singleton"
        ? cid.toLowerCase().includes("singleton")
        : cid === clusterID;
    });
    const analysis_profile = match?.properties.analysis_profile ?? "default";
    const color = getColor(clusterID, analysis_profile, true);

    return {
      label: clusterID,
      data: labels.map((label) => dataByDate[label][clusterID] ?? 0),
      backgroundColor: color,
      borderColor: chartType === "bar" ? "black" : color,
      borderWidth: chartType === "bar" ? 1 : 2,
      fill: chartType !== "bar",
      stack: "stack",
    };
  });

  const lineOptions = {
    responsive: true,
    plugins: { legend: { position: "top" } },
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        ticks: { beginAtZero: true, stepSize: 1, precision: 0 },
      },
    },
  };

  return (
    <div className="timeline-component" style={{ marginBottom: "0px" }}>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}
      >
        <SelectButton
          value={grouping}
          options={GROUPING_OPTIONS}
          onChange={(e) => setGrouping(e.value)}
          style={{ marginRight: "10px" }}
        />
        <Button
          className="p-button p-button-outlined"
          onClick={() => setChartType((t) => (t === "bar" ? "line" : "bar"))}
          style={{ marginRight: "10px" }}
        >
          {chartType === "bar" ? "Line Chart" : "Bar Chart"}
        </Button>
        <div
          style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}
        >
          <PrimeTooltip target=".export-button" position="bottom" />
          <Button
            icon="pi pi-image"
            className="p-button-rounded export-button custom-export-button"
            aria-label="Export Image"
            onClick={() => exportTimelineImage(chartRef)}
            text
            raised
            data-pr-tooltip="Export as image"
          />
        </div>
      </div>

      <div ref={chartRef}>
        {chartType === "bar" ? (
          <StackedClusterBar
            datasets={datasets}
            labels={labels}
            height="200px"
            showLegend
          />
        ) : (
          <Line data={{ labels, datasets }} options={lineOptions} height={30} />
        )}
      </div>

      {missingDateCount > 0 && (
        <div
          style={{
            fontSize: "10px",
            color: "#ccc",
            fontStyle: "italic",
            marginTop: "6px",
          }}
        >
          {missingDateCount} sample{missingDateCount !== 1 ? "s" : ""} without
          collection date
        </div>
      )}
    </div>
  );
};

export default Timeline;
