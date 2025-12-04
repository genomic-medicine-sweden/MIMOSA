import React, { useEffect, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import postcodeCoordinates from "@/assets/postcode-coordinates";
import boundariesData from "@/assets/sweden-with-regions";
import { getColor } from "@/utils/ColorAssignment";
import HospitalCoordinates from "@/assets/hospital-coordinates";
import * as turf from "@turf/turf";
import createPieChartSVG from "@/utils/PieChart";
import { colorMapping } from "@/utils/MapColor";
import { generateInfoContent } from "@/utils/info";
import { generateOutbreakMessage } from "@/utils/OutBreakMessage";

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
  staticView = false,
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const selectedMarkerRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const currentZoomRef = useRef(null);

  const defaultStyle = useMemo(
    () => ({
      color: mapColor,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.5,
    }),
    [mapColor],
  );

  const highlightStyle = useMemo(
    () => ({
      color: colorMapping[mapColor] || mapColor,
      fillColor: colorMapping[mapColor] || mapColor,
      opacity: 1,
      fillOpacity: 0.5,
    }),
    [mapColor],
  );

  const pickZoom = () => {
    const width = window.innerWidth;
    if (width < 768) return 4;
    if (width < 1300) return 4.25;
    if (width > 2300) return 5.25;
    return 5;
  };

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

    if (!Array.isArray(filteredData) || filteredData.length === 0) return;

    filteredData.forEach((item) => {
      const { PostCode, Date, ID, Hospital, Cluster_ID, analysis_profile } =
        item.properties;
      let coordinates, County;

      if (!hospitalView && postcodeCoordinates[PostCode]) {
        coordinates = postcodeCoordinates[PostCode].coordinates;
        County = postcodeCoordinates[PostCode].County;
      } else if (hospitalView && HospitalCoordinates[Hospital]) {
        const postCode = HospitalCoordinates[Hospital].PostCode;
        const locationData = postcodeCoordinates[postCode];
        if (!locationData) return;
        coordinates = locationData.coordinates;
        County = locationData.County;
      } else {
        return;
      }

      const point = {
        type: "Point",
        coordinates: [coordinates[1], coordinates[0]],
      };

      boundariesData.features.forEach((feature) => {
        const geometry = feature.geometry;
        if (
          (geometry.type === "Polygon" || geometry.type === "MultiPolygon") &&
          turf.booleanPointInPolygon(point, feature)
        ) {
          const countyName = feature.properties.name;
          if (!countyCounts[countyName]) {
            countyCounts[countyName] = { total: 0, Cluster_ID: {} };
          }
          countyCounts[countyName].total++;
          countyCounts[countyName].Cluster_ID[Cluster_ID] =
            (countyCounts[countyName].Cluster_ID[Cluster_ID] || 0) + 1;
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

  const updateGeoJsonLayer = useCallback(() => {
    if (!mapInstance.current) return;

    if (geojsonLayerRef.current) {
      mapInstance.current.removeLayer(geojsonLayerRef.current);
    }

    geojsonLayerRef.current = L.geoJSON(boundariesData, {
      style: (feature) => {
        const countyName = feature.properties.name;
        const shouldHighlight = !(
          countyFilter.includes(countyName) ===
          selectedCounties.includes(countyName)
        );
        return shouldHighlight ? highlightStyle : defaultStyle;
      },
      filter: (feature) =>
        selectedCounties.includes("All") ||
        selectedCounties.includes(feature.properties.name),
      onEachFeature: (feature, layer) => {
        layer.on("mouseover", () => {
          if (!selectedCounties || selectedCounties.includes("All")) {
            layer.setStyle(highlightStyle);
            const countyName = feature.properties.name;
            const countyData = (infoRef.current?.countyCounts &&
              infoRef.current.countyCounts[countyName]) || {
              total: 0,
              Cluster_ID: {},
            };
            onInfoUpdate(generateInfoContent(countyName, countyData));
          }
        });
        layer.on("mouseout", () => {
          geojsonLayerRef.current.resetStyle(layer);
          onInfoUpdate("");
        });
        layer.on("click", (e) => {
          mapInstance.current.fitBounds(e.target.getBounds());
        });
      },
    }).addTo(mapInstance.current);
  }, [
    selectedCounties,
    defaultStyle,
    highlightStyle,
    onInfoUpdate,
    infoRef,
    countyFilter,
  ]);

  useEffect(() => {
    const waitForMapContainer = (callback) => {
      const checkSize = () => {
        if (
          mapRef.current &&
          mapRef.current.clientWidth > 0 &&
          mapRef.current.clientHeight > 0
        ) {
          setTimeout(callback, 0);
        } else {
          requestAnimationFrame(checkSize);
        }
      };
      checkSize();
    };

    let cleanupFn = () => {};

    if (!mapInstance.current) {
      waitForMapContainer(() => {
        const swedenBounds = [
          [54.0, 10.0],
          [70.0, 25.0],
        ];

        const initialZoom = pickZoom();
        currentZoomRef.current = initialZoom;

        const map = L.map(mapRef.current, {
          minZoom: initialZoom,
          maxZoom: 18,
          maxBounds: swedenBounds,
          maxBoundsViscosity: 1.0,
          zoomControl: false,
        });

        mapInstance.current = map;

        let initialBounds = swedenBounds;

        if (
          staticView &&
          selectedCounties.length === 1 &&
          selectedCounties[0] !== "All"
        ) {
          const feature = boundariesData.features.find(
            (f) => f.properties.name === selectedCounties[0],
          );
          if (feature) {
            initialBounds = L.geoJSON(feature).getBounds();
          }
        }

        map.fitBounds(initialBounds, { animate: false });

        setTimeout(() => {
          map.invalidateSize();
          const newZoom = pickZoom();
          currentZoomRef.current = newZoom;
          map.setMinZoom(newZoom);
          if (!staticView) {
            map.setView([63.0, 15.0], newZoom);
          }
        }, 100);

        L.svg({ padding: 0 }).addTo(map);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
          opacity: 0,
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

        const handleResize = () => {
          const waitAndResize = () => {
            if (
              mapRef.current &&
              mapRef.current.clientWidth > 0 &&
              mapRef.current.clientHeight > 0
            ) {
              const newZoom = pickZoom();
              if (newZoom !== currentZoomRef.current) {
                currentZoomRef.current = newZoom;
                mapInstance.current.setMinZoom(newZoom);
                if (!staticView) {
                  mapInstance.current.setView([63.0, 15.0], newZoom);
                }
              }
              mapInstance.current.invalidateSize();
            } else {
              requestAnimationFrame(waitAndResize);
            }
          };
          waitAndResize();
        };
        window.addEventListener("resize", handleResize);

        cleanupFn = () => {
          window.removeEventListener("resize", handleResize);
        };

        updateGeoJsonLayer();
        clearAndAddMarkers();
      });
    } else {
      updateGeoJsonLayer();
      clearAndAddMarkers();
    }

    return () => {
      cleanupFn();
      Object.values(markersRef.current).forEach((markerCluster) =>
        markerCluster.clearLayers(),
      );
    };
  }, [
    clearAndAddMarkers,
    updateGeoJsonLayer,
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
      mapInstance.current.fitBounds([
        [54.0, 10.0],
        [70.0, 25.0],
      ]);
    }

    if (selectedCounties[0] !== "All") {
      const countyName = selectedCounties[0];
      const feature = boundariesData.features.find(
        (f) => f.properties.name === countyName,
      );

      if (feature) {
        const bounds = L.geoJSON(feature).getBounds();
        mapInstance.current.fitBounds(bounds);

        const countyData = infoRef.current?.countyCounts?.[countyName] || {
          total: 0,
          Cluster_ID: {},
        };
        onInfoUpdate(generateInfoContent(countyName, countyData));
      }
    }

    prevSelectedCounties.current = selectedCounties;
  }, [selectedCounties, infoRef, onInfoUpdate]);

  return (
    <div>
      <div
        ref={mapRef}
        className="map-container"
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
