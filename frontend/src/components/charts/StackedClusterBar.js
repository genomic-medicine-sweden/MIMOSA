"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

const caseSquaresPlugin = {
  id: "caseSquares",
  afterDatasetsDraw(chart) {
    const { ctx, scales } = chart;
    const unitH = Math.abs(
      scales.y.getPixelForValue(1) - scales.y.getPixelForValue(0),
    );
    if (unitH < 2) return;

    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;

    chart.data.datasets.forEach((_, di) => {
      const meta = chart.getDatasetMeta(di);
      if (!meta.visible) return;
      meta.data.forEach((bar) => {
        const { x, y, width, base } = bar.getProps(
          ["x", "y", "width", "base"],
          true,
        );
        const totalUnits = Math.round((base - y) / unitH);
        for (let i = 1; i < totalUnits; i++) {
          const lineY = base - i * unitH;
          ctx.beginPath();
          ctx.moveTo(x - width / 2 + 1, lineY);
          ctx.lineTo(x + width / 2 - 1, lineY);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(x - width / 2, y);
        ctx.lineTo(x - width / 2, base);
        ctx.stroke();
      });
    });

    ctx.restore();
  },
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  caseSquaresPlugin,
);

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      stacked: true,
      grid: { display: false },
      border: { color: "#ccc" },
      ticks: {
        font: { family: "monospace", size: 10 },
        color: "#aaa",
        maxRotation: 0,
        autoSkip: true,
        autoSkipPadding: 8,
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      grid: { color: "#f0f0f0" },
      border: { display: false },
      ticks: {
        font: { family: "monospace", size: 9 },
        color: "#bbb",
        precision: 0,
        stepSize: 5,
      },
    },
  },
  categoryPercentage: 1.0,
  barPercentage: 0.95,
};

export default function StackedClusterBar({
  datasets,
  labels,
  height = "300px",
  tooltipCallbacks,
  onClick,
  showLegend = false,
}) {
  const options = {
    ...BASE_OPTIONS,
    plugins: {
      ...BASE_OPTIONS.plugins,
      legend: { display: showLegend, position: "top" },
      tooltip: {
        callbacks: tooltipCallbacks ?? {},
      },
    },
    onClick: onClick
      ? (e, elements) => onClick(e, elements, datasets)
      : undefined,
  };

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <Bar data={{ labels, datasets }} options={options} />
    </div>
  );
}
