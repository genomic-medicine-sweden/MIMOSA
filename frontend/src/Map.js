import React, { useEffect, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import postcodeCoordinates from "./assets/postcode-coordinates";
import boundariesData from "./assets/sweden-with-regions";
import { getColor } from "./ColorAssignment";
import HospitalCoordinates from "./assets/hospital-coordinates";
import * as turf from "@turf/turf";
import createPieChartSVG from "./PieChart";
import { colorMapping } from "./MapColor";
import { generateInfoContent } from "./info";
import { generateOutbreakMessage } from "./OutBreakMessage";

const Map = ({
  filteredData,
  hospitalView,
  mapColor,
  markerSize,
  onInfoUpdate,
  onOutbreakUpdate,
  selectedCounties,
  infoRef,
  countyFilter,
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const selectedMarkerRef = useRef(null);
  const geojsonLayerRef = useRef(null);

  const defaultStyle = useMemo(
    () => ({
      color: mapColor,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.5,
    }),
    [mapColor]
  );

  const highlightStyle = useMemo(
    () => ({
      color: colorMapping[mapColor] || mapColor,
      fillColor: colorMapping[mapColor] || mapColor,
      opacity: 1,
      fillOpacity: 0.5,
    }),
    [mapColor]
  );

  const createPieClusterIcon = useCallback((cluster, markerSize) => {
    const childMarkers = cluster.getAllChildMarkers();
    const count = cluster.getChildCount();
    const filteredData = {};

    childMarkers.forEach((marker) => {
      const category = marker.options.fillColor;
      filteredData[category] = (filteredData[category] || 0) + 1;
    });

    const chartData = Object.entries(filteredData).map(([color, value]) => [
      value,
      color,
    ]);

    const pieChartSize = markerSize * 3.5;
    const chartSVG = createPieChartSVG(chartData, pieChartSize);

    return L.divIcon({
      html: `
        <div style="width: ${pieChartSize}px; height: ${pieChartSize}px; position: relative; display: flex; align-items: center; justify-content: center;">
          ${chartSVG}
          <div style="position: absolute; width: ${pieChartSize}px; height: ${pieChartSize}px; display: flex; align-items: center; justify-content: center; font-size: ${
        Math.log(count) * 3
      }px; color: black;">
            ${count}
          </div>
        </div>
      `,
      className: "pie-cluster-icon",
      iconSize: [pieChartSize, pieChartSize],
    });
  }, []);

  const clearAndAddMarkers = useCallback(() => {
    Object.values(markersRef.current).forEach((markerCluster) => {
      markerCluster.clearLayers();
    });

    markersRef.current = {};
    const countyCounts = {};

    if (!Array.isArray(filteredData) || filteredData.length === 0) {
      return;
    }

    filteredData.forEach((item) => {
      const { PostCode, Date, ID, Hospital, Cluster_ID, analysis_profile } =
        item.properties;
      let coordinates;
      let County;

      if (!hospitalView && postcodeCoordinates[PostCode]) {
        coordinates = postcodeCoordinates[PostCode].coordinates;
        County = postcodeCoordinates[PostCode].County;
      } else if (hospitalView && HospitalCoordinates[Hospital]) {
        coordinates = HospitalCoordinates[Hospital].coordinates;
        County = HospitalCoordinates[Hospital].County;
      } else {
        return;
      }

      const point = {
        type: "Point",
        coordinates: [coordinates[1], coordinates[0]],
      };

      boundariesData.features.forEach((feature) => {
        const geometry = feature.geometry;
        let countyName = "Unknown";

        if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
          if (turf.booleanPointInPolygon(point, feature)) {
            countyName = feature.properties.name;

            if (!countyCounts[countyName]) {
              countyCounts[countyName] = { total: 0, Cluster_ID: {} };
            }
            countyCounts[countyName].total++;
            countyCounts[countyName].Cluster_ID[Cluster_ID] =
              (countyCounts[countyName].Cluster_ID[Cluster_ID] || 0) + 1;
          }
        }
      });

      const color = getColor(Cluster_ID, analysis_profile);
      const marker = L.circleMarker(coordinates, {
        color: "black",
        fillColor: color,
        fillOpacity: 1,
        radius: markerSize,
        weight: 1,
      });

      const clusterKey = hospitalView ? Hospital : PostCode;

      if (!markersRef.current[clusterKey]) {
        markersRef.current[clusterKey] = L.markerClusterGroup({
          iconCreateFunction: (cluster) =>
            createPieClusterIcon(cluster, markerSize),
        });
        mapInstance.current.addLayer(markersRef.current[clusterKey]);
      }

      const popupContent = `
        <div>
          <h3>ID: ${ID}</h3>
          <b>Cluster_ID:</b> ${Cluster_ID}<br>
          ${!hospitalView ? `<b>County:</b> ${County}<br>` : ""}
          ${!hospitalView ? `<b>Postcode:</b> ${PostCode.slice(-5)}<br>` : ""}
          <b>Date:</b> ${Date}<br>
          <b>Hospital:</b> ${Hospital}<br>
        </div>
      `;

      marker.on("click", () => {
        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.setStyle({ weight: 1 });
          selectedMarkerRef.current.closePopup();
        }
        marker.setStyle({ weight: markerSize / 3 });
        selectedMarkerRef.current = marker;
        marker.bindPopup(popupContent).openPopup();
      });

      markersRef.current[clusterKey].addLayer(marker);
    });

    if (infoRef.current) {
      infoRef.current.countyCounts = countyCounts;
    }

    const outbreakMessage = generateOutbreakMessage(countyCounts);
    onOutbreakUpdate(outbreakMessage);
  }, [
    filteredData,
    hospitalView,
    markerSize,
    createPieClusterIcon,
    onOutbreakUpdate,
    infoRef,
  ]);

  useEffect(() => {
    const initializeMap = () => {
      const swedenBounds = [
        [54.0, 10.0],
        [70.0, 25.0],
      ];

      const map = L.map(mapRef.current, {
        minZoom: 5,
        maxZoom: 18,
        maxBounds: swedenBounds,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
      }).setView([63.0, 15.0], 5);

      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        opacity: 0,
      }).addTo(map);

      map.fitBounds(swedenBounds);

      geojsonLayerRef.current = L.geoJSON(boundariesData, {
        style: defaultStyle,
        filter: (feature) => {
          if (selectedCounties.includes("All")) return true;
          return selectedCounties.includes(feature.properties.name);
        },
        onEachFeature: (feature, layer) => {
          layer.on("mouseover", function () {
            if (!selectedCounties || selectedCounties.includes("All")) {
              layer.setStyle(highlightStyle);
              const countyName = feature.properties.name;
              const countyData = infoRef.current.countyCounts[countyName] || {
                total: 0,
                Cluster_ID: {},
              };
              const content = generateInfoContent(countyName, countyData);
              onInfoUpdate(content);
            }
          });
          layer.on("mouseout", function () {
            geojsonLayerRef.current.resetStyle(layer);
            onInfoUpdate("");
          });
          layer.on("click", (e) => {
            map.fitBounds(e.target.getBounds());
          });
        },
      }).addTo(map);

      const infoControl = L.control({ position: "topright" });

      infoControl.onAdd = function () {
        const div = L.DomUtil.create("div", "info");
        div.style.backgroundColor = "transparent";
        div.style.padding = "8px";
        div.style.borderRadius = "5px";
        return div;
      };

      infoControl.update = function (content) {
        this.getContainer().innerHTML = content || "";
      };

      infoControl.addTo(map);
      infoRef.current = infoControl;
    };

    if (!mapInstance.current) {
      initializeMap();
    } else {
      mapInstance.current.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
          mapInstance.current.removeLayer(layer);
        }
      });

      geojsonLayerRef.current = L.geoJSON(boundariesData, {
        style: (feature) => {
          const countyName = feature.properties.name;
          const shouldHighlight = !(
            countyFilter.includes(countyName) ===
            selectedCounties.includes(countyName)
          );
          return shouldHighlight ? highlightStyle : defaultStyle;
        },
        filter: (feature) => {
          if (selectedCounties.includes("All")) return true;
          return selectedCounties.includes(feature.properties.name);
        },
        onEachFeature: (feature, layer) => {
          layer.on("mouseover", function () {
            if (!selectedCounties || selectedCounties.includes("All")) {
              layer.setStyle(highlightStyle);
              const countyName = feature.properties.name;
              const countyData = (infoRef.current.countyCounts &&
                infoRef.current.countyCounts[countyName]) || {
                total: 0,
                Cluster_ID: {},
              };
              const content = generateInfoContent(countyName, countyData);
              onInfoUpdate(content);
            }
          });
          layer.on("mouseout", function () {
            geojsonLayerRef.current.resetStyle(layer);
            onInfoUpdate("");
          });
          layer.on("click", (e) => {
            mapInstance.current.fitBounds(e.target.getBounds());
          });
        },
      }).addTo(mapInstance.current);
    }

    clearAndAddMarkers();

    return () => {
      Object.values(markersRef.current).forEach((markerCluster) => {
        markerCluster.clearLayers();
      });
    };
  }, [
    clearAndAddMarkers,
    defaultStyle,
    highlightStyle,
    onInfoUpdate,
    selectedCounties,
    infoRef,
    countyFilter,
  ]);

  const prevSelectedCounties = useRef(selectedCounties);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (
      selectedCounties.length === 1 &&
      selectedCounties[0] === "All" &&
      prevSelectedCounties.current[0] !== "All"
    ) {
      const swedenBounds = [
        [54.0, 10.0],
        [70.0, 25.0],
      ];
      mapInstance.current.fitBounds(swedenBounds);
    }

    if (selectedCounties[0] !== "All") {
      const countyName = selectedCounties[0];
      const feature = boundariesData.features.find(
        (f) => f.properties.name === countyName
      );

      if (feature) {
        const layer = L.geoJSON(feature);
        const bounds = layer.getBounds();
        mapInstance.current.fitBounds(bounds);

        const countyData = infoRef.current?.countyCounts?.[countyName] || {
          total: 0,
          Cluster_ID: {},
        };
        const content = generateInfoContent(countyName, countyData);
        onInfoUpdate(content);
      }
    }

    prevSelectedCounties.current = selectedCounties;
  }, [selectedCounties, infoRef, onInfoUpdate]);

  return (
    <div>
      <div
        ref={mapRef}
        style={{
          height: "75vh",
          width: "100%",
          backgroundColor: "transparent",
        }}
      ></div>
    </div>
  );
};

export default Map;

