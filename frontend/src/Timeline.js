import React, { useState, useEffect, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { getColor } from "./ColorAssignment";
import { SelectButton } from "primereact/selectbutton";
import "primeicons/primeicons.css";
import { exportTimelineImage } from "./TimelineExport";
import { Button } from "primereact/button";
import { Tooltip as PrimeTooltip } from "primereact/tooltip";

Chart.register(
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

const Timeline = ({ filteredData }) => {
  const [grouping, setGrouping] = useState("date");
  const [chartType, setChartType] = useState("bar");
  const chartRef = useRef(null);

  const groupDataBy = (data, groupingType) => {
    const groupedData = {};
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
      if (clusterID.toLowerCase().includes("singleton")) {
        clusterID = "Singleton";
      }

      if (!groupedData[date]) {
        groupedData[date] = {};
      }
      if (!groupedData[date][clusterID]) {
        groupedData[date][clusterID] = 0;
      }
      groupedData[date][clusterID] += 1;
    });
    return groupedData;
  };

  const dataByDate = groupDataBy(filteredData, grouping);
  const labels = Object.keys(dataByDate).sort();

  const uniqueClusterIDs = [
    ...new Set(
      filteredData.map((item) => {
        let cid = item.properties.Cluster_ID;
        if (cid.toLowerCase().includes("singleton")) {
          return "Singleton";
        }
        return cid;
      })
    ),
  ];

  const datasets = uniqueClusterIDs.map((Cluster_ID) => {
    let itemWithID = filteredData.find((item) => {
      let cid = item.properties.Cluster_ID;
      if (Cluster_ID === "Singleton") {
        return cid.toLowerCase().includes("singleton");
      }
      return cid === Cluster_ID;
    });
    const analysis_profile = itemWithID ? itemWithID.properties.analysis_profile : "default";

    return {
      label: Cluster_ID,
      data: labels.map((label) => dataByDate[label][Cluster_ID] || 0),
      backgroundColor: getColor(Cluster_ID, analysis_profile, true),
      borderColor:
        chartType === "bar"
          ? "black"
          : getColor(Cluster_ID, analysis_profile, true),
      borderWidth: chartType === "bar" ? 1 : 2,
      fill: chartType !== "bar",
    };
  });

  const chartData = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        ticks: {
          beginAtZero: true,
          stepSize: 1,
          precision: 0,
        },
      },
    },
  };

  const groupingOptions = [
    { label: "Year", value: "year" },
    { label: "Year-Month", value: "year-month" },
    { label: "Date", value: "date" },
  ];

  const toggleChartType = () => {
    setChartType((prevType) => (prevType === "bar" ? "line" : "bar"));
  };

  useEffect(() => {
    setGrouping("date");
  }, []);

  return (
    <div className="timeline-component" style={{ marginBottom: "0px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <SelectButton
          value={grouping}
          options={groupingOptions}
          onChange={(e) => setGrouping(e.value)}
          style={{ marginRight: "10px" }}
        />
        <Button
          className="p-button p-button-outlined"
          onClick={toggleChartType}
          style={{ marginRight: "10px" }}
        >
          {chartType === "bar" ? "Line Chart" : "Bar Chart"}
        </Button>
        <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
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
          <Bar data={chartData} options={options} height={30} />
        ) : (
          <Line data={chartData} options={options} height={30} />
        )}
      </div>
    </div>
  );
};

export default Timeline;

