import L from "leaflet";
import createPieChartSVG from "@/utils/PieChart";

export const SHAPES = ["circle", "triangle", "square", "diamond"];

export const SHAPE_SVG = {
  circle: (s, dashed = false) =>
    `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 2}" fill="none" stroke="#555" stroke-width="2" ${dashed ? 'stroke-dasharray="3,4" stroke-linecap="round"' : ""}/>`,
  triangle: (s, dashed = false) =>
    `<polygon points="${s / 2},2 ${s - 2},${s - 2} 2,${s - 2}" fill="none" stroke="#555" stroke-width="2" ${dashed ? 'stroke-dasharray="3,4" stroke-linecap="round"' : ""}/>`,
  square: (s, dashed = false) =>
    `<rect x="2" y="2" width="${s - 4}" height="${s - 4}" fill="none" stroke="#555" stroke-width="2" ${dashed ? 'stroke-dasharray="3,4" stroke-linecap="round"' : ""}/>`,
  diamond: (s, dashed = false) =>
    `<polygon points="${s / 2},2 ${s - 2},${s / 2} ${s / 2},${s - 2} 2,${s / 2}" fill="none" stroke="#555" stroke-width="2" ${dashed ? 'stroke-dasharray="3,4" stroke-linecap="round"' : ""}/>`,
};

export function getShape(
  platform,
  shapeByPlatform,
  platformShapeMap,
  platformOrder,
) {
  if (!shapeByPlatform) return "circle";
  const key = (platform || "unknown").toLowerCase();
  if (!(key in platformShapeMap)) {
    const index = platformOrder.length;
    platformOrder.push(key);
    platformShapeMap[key] = SHAPES[index % SHAPES.length];
  }
  return platformShapeMap[key];
}

export function createShapeIcon(shape, color, size) {
  const s = size * 2.5;

  const filledSVG = {
    circle: `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 2}" fill="${color}" stroke="black" stroke-width="1"/>`,
    triangle: `<polygon points="${s / 2},2 ${s - 2},${s - 2} 2,${s - 2}" fill="${color}" stroke="black" stroke-width="1"/>`,
    square: `<rect x="2" y="2" width="${s - 4}" height="${s - 4}" fill="${color}" stroke="black" stroke-width="1"/>`,
    diamond: `<polygon points="${s / 2},2 ${s - 2},${s / 2} ${s / 2},${s - 2} 2,${s / 2}" fill="${color}" stroke="black" stroke-width="1"/>`,
  };

  return L.divIcon({
    html: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">${filledSVG[shape]}</svg>`,
    className: "",
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  });
}

export function createPieClusterIcon(cluster, markerSize, shapeByPlatform) {
  const childMarkers = cluster.getAllChildMarkers();
  const count = cluster.getChildCount();
  const grouped = {};

  childMarkers.forEach((marker) => {
    const category = marker.options.fillColor;
    grouped[category] = (grouped[category] || 0) + 1;
  });

  const chartData = Object.entries(grouped).map(([color, value]) => [
    value,
    color,
  ]);
  const pieChartSize = markerSize * 3.5;

  const hasMixedPlatforms =
    shapeByPlatform &&
    new Set(
      childMarkers.map((m) => (m.options.platform || "unknown").toLowerCase()),
    ).size > 1;

  const chartSVG = createPieChartSVG(
    chartData,
    pieChartSize,
    1,
    hasMixedPlatforms,
  );

  const actualPieSize = pieChartSize + 2;

  return L.divIcon({
    html: `
      <div style="width: ${actualPieSize}px; height: ${actualPieSize}px; position: relative; display: flex; align-items: center; justify-content: center;">
        ${chartSVG}
        <div style="position: absolute; width: ${actualPieSize}px; height: ${actualPieSize}px; display: flex; align-items: center; justify-content: center; font-size: ${
          Math.log(count) * 3
        }px; color: black;">
          ${count}
        </div>
      </div>
    `,
    className: "pie-cluster-icon",
    iconSize: [actualPieSize, actualPieSize],
  });
}

export function createMarker(coordinates, color, markerSize, shape, platform) {
  if (shape === "circle") {
    return L.circleMarker(coordinates, {
      color: "black",
      fillColor: color,
      fillOpacity: 1,
      radius: markerSize,
      weight: 1,
      platform,
    });
  }

  return L.marker(coordinates, {
    icon: createShapeIcon(shape, color, markerSize),
    fillColor: color,
    platform,
  });
}

export function buildPopupContent({
  ID,
  Cluster_ID,
  County,
  PostCode,
  Date,
  Hospital,
  hospitalView,
  postcodePrefix = "",
}) {
  const displayPostcode = PostCode.startsWith(postcodePrefix)
    ? PostCode.slice(postcodePrefix.length)
    : PostCode;
  return `
    <div>
      <h3>ID: ${ID}</h3>
      <b>Cluster_ID:</b> ${Cluster_ID}<br>
      ${!hospitalView ? `<b>County:</b> ${County}<br>` : ""}
      ${!hospitalView ? `<b>Postcode:</b> ${displayPostcode}<br>` : ""}
      <b>Date:</b> ${Date}<br>
      <b>Hospital:</b> ${Hospital}<br>
    </div>
  `;
}
