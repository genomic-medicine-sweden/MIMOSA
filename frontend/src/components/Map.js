import React, { useEffect, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import * as turf from "@turf/turf";
import { useMapConfigContext } from "@/components/AppWrapper";
import { colorMapping } from "@/utils/MapColor";
import { generateInfoContent } from "@/utils/info";
import { getColor, countOccurrences } from "@/utils/ColorAssignment";
import { getCounty } from "@/utils/locationUtils";
import { getInitialBounds } from "@/utils/mapUtils";
import {
  getShape,
  createPieClusterIcon,
  createMarker,
  buildPopupContent,
} from "@/utils/markerUtils";

const Map = ({
  filteredData,
  hospitalView,
  mapColor,
  markerSize,
  onInfoUpdate,
  selectedCounties,
  infoRef,
  countyFilter,
  onVisualisedDataChange,
  staticView = false,
  shapeByPlatform,
}) => {
  const {
    bounds,
    center,
    boundariesData,
    postcodeCoordinates = {},
    hospitalCoordinates = {},
    regionNameKey,
    postcodePrefix = "",
  } = useMapConfigContext();

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const selectedMarkerRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const currentZoomRef = useRef(null);
  const previousVisualisedRef = useRef([]);

  const platformShapeMap = useRef({});
  const platformOrder = useRef([]);

  useEffect(() => {
    platformShapeMap.current = {};
    platformOrder.current = [];
  }, [shapeByPlatform]);

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

  const clearAndAddMarkers = useCallback(() => {
    Object.values(markersRef.current).forEach((markerCluster) => {
      markerCluster.clearLayers();
    });
    markersRef.current = {};
    const countyCounts = {};

    if (!Array.isArray(filteredData) || filteredData.length === 0) return;

    const resolvePostcodeKey = (pc) =>
      postcodeCoordinates[pc]
        ? pc
        : postcodeCoordinates[`${postcodePrefix}${pc}`]
          ? `${postcodePrefix}${pc}`
          : null;

    const BORDER_BUFFER = 1;
    const hasValidCoords = (item) => {
      const coords = item.properties.manualCoordinates;
      if (!coords || coords.lat === "" || coords.lng === "") return false;
      const lat = Number(coords.lat);
      const lng = Number(coords.lng);
      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      )
        return false;
      const point = turf.point([lng, lat]);
      const insideCountry = boundariesData.features.some(
        (feature) =>
          (feature.geometry.type === "Polygon" ||
            feature.geometry.type === "MultiPolygon") &&
          turf.booleanPointInPolygon(point, feature),
      );
      if (insideCountry) return true;
      const [[minLat, minLng], [maxLat, maxLng]] = bounds;
      return (
        lat >= minLat - BORDER_BUFFER &&
        lat <= maxLat + BORDER_BUFFER &&
        lng >= minLng - BORDER_BUFFER &&
        lng <= maxLng + BORDER_BUFFER
      );
    };

    const visualisedItems = filteredData.filter((item) => {
      const { PostCode, Hospital } = item.properties;
      if (!hospitalView && resolvePostcodeKey(PostCode)) return true;
      if (hospitalView && hospitalCoordinates[Hospital]) {
        const postCode = hospitalCoordinates[Hospital].PostCode;
        if (resolvePostcodeKey(postCode)) return true;
      }
      return hasValidCoords(item);
    });

    if (onVisualisedDataChange) {
      const previous = previousVisualisedRef.current;
      const hasChanged =
        previous.length !== visualisedItems.length ||
        previous.some((item, index) => item !== visualisedItems[index]);

      if (hasChanged) {
        previousVisualisedRef.current = visualisedItems;
        onVisualisedDataChange(visualisedItems);
      }
    }

    countOccurrences(visualisedItems);

    visualisedItems.forEach((item) => {
      const {
        PostCode,
        Date,
        ID,
        Hospital,
        Cluster_ID,
        analysis_profile,
        Sequencing_Platform,
      } = item.properties;

      let coordinates, County;

      if (!hospitalView) {
        const key = resolvePostcodeKey(PostCode);
        if (key) {
          coordinates = postcodeCoordinates[key].coordinates;
          County = getCounty(key);
        } else if (hasValidCoords(item)) {
          coordinates = [
            Number(item.properties.manualCoordinates.lat),
            Number(item.properties.manualCoordinates.lng),
          ];
        } else {
          return;
        }
      } else {
        if (hospitalCoordinates[Hospital]) {
          const postCode = hospitalCoordinates[Hospital].PostCode;
          const key = resolvePostcodeKey(postCode);
          if (key) {
            coordinates = postcodeCoordinates[key].coordinates;
            County = getCounty(key);
          } else if (hasValidCoords(item)) {
            coordinates = [
              Number(item.properties.manualCoordinates.lat),
              Number(item.properties.manualCoordinates.lng),
            ];
          } else {
            return;
          }
        } else if (hasValidCoords(item)) {
          coordinates = [
            Number(item.properties.manualCoordinates.lat),
            Number(item.properties.manualCoordinates.lng),
          ];
        } else {
          return;
        }
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
          const countyName = feature.properties[regionNameKey];
          if (!countyCounts[countyName]) {
            countyCounts[countyName] = { total: 0, Cluster_ID: {} };
          }
          countyCounts[countyName].total++;
          countyCounts[countyName].Cluster_ID[Cluster_ID] =
            (countyCounts[countyName].Cluster_ID[Cluster_ID] || 0) + 1;
        }
      });

      const color = getColor(Cluster_ID, analysis_profile);
      const platform = (Sequencing_Platform || "unknown").toLowerCase();
      const shape = getShape(
        platform,
        shapeByPlatform,
        platformShapeMap.current,
        platformOrder.current,
      );
      const marker = createMarker(
        coordinates,
        color,
        markerSize,
        shape,
        platform,
      );

      const naturalKey = hospitalView ? Hospital : PostCode;
      const clusterKey =
        naturalKey || `coords_${coordinates[0]},${coordinates[1]}`;

      if (!markersRef.current[clusterKey]) {
        markersRef.current[clusterKey] = L.markerClusterGroup({
          iconCreateFunction: (cluster) =>
            createPieClusterIcon(cluster, markerSize, shapeByPlatform),
        });
        mapInstance.current.addLayer(markersRef.current[clusterKey]);
      }

      const popupContent = buildPopupContent({
        ID,
        Cluster_ID,
        County,
        PostCode,
        Date,
        Hospital,
        hospitalView,
        postcodePrefix,
      });

      marker.on("click", () => {
        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.setStyle?.({ weight: 1 });
          selectedMarkerRef.current.closePopup();
        }
        marker.setStyle?.({ weight: markerSize / 3 });
        selectedMarkerRef.current = marker;
        marker.bindPopup(popupContent).openPopup();
      });

      markersRef.current[clusterKey].addLayer(marker);
    });

    if (infoRef.current) {
      infoRef.current.countyCounts = countyCounts;
    }
  }, [
    filteredData,
    hospitalView,
    markerSize,
    infoRef,
    onVisualisedDataChange,
    shapeByPlatform,
    postcodeCoordinates,
    hospitalCoordinates,
    boundariesData,
    regionNameKey,
    postcodePrefix,
    bounds,
  ]);

  const updateGeoJsonLayer = useCallback(() => {
    if (!mapInstance.current) return;

    if (geojsonLayerRef.current) {
      mapInstance.current.removeLayer(geojsonLayerRef.current);
    }

    geojsonLayerRef.current = L.geoJSON(boundariesData, {
      style: (feature) => {
        const countyName = feature.properties[regionNameKey];
        const shouldHighlight = !(
          countyFilter.includes(countyName) ===
          selectedCounties.includes(countyName)
        );
        return shouldHighlight ? highlightStyle : defaultStyle;
      },
      filter: (feature) =>
        selectedCounties.includes("All") ||
        selectedCounties.includes(feature.properties[regionNameKey]),
      onEachFeature: (feature, layer) => {
        layer.on("mouseover", () => {
          if (!selectedCounties || selectedCounties.includes("All")) {
            layer.setStyle(highlightStyle);
            const countyName = feature.properties[regionNameKey];
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
    boundariesData,
    regionNameKey,
  ]);

  useEffect(() => {
    let cancelled = false;
    let cleanupFn = () => {};

    const waitForMapContainer = (callback) => {
      const checkSize = () => {
        if (cancelled) return;
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

    if (!mapInstance.current) {
      waitForMapContainer(() => {
        if (cancelled) return;

        if (mapRef.current._leaflet_id) {
          mapRef.current._leaflet_id = null;
        }

        const expandedBounds = [
          [bounds[0][0] - 5, bounds[0][1] - 5],
          [bounds[1][0] + 5, bounds[1][1] + 5],
        ];

        const map = L.map(mapRef.current, {
          minZoom: 1,
          maxZoom: 18,
          maxBounds: expandedBounds,
          maxBoundsViscosity: 0.5,
          zoomControl: false,
          zoomSnap: 0.1,
          zoomDelta: 0.5,
        });

        mapInstance.current = map;

        const initialBounds = getInitialBounds(staticView, selectedCounties, {
          bounds,
          boundariesData,
          regionNameKey,
        });
        map.fitBounds(initialBounds, { animate: false, padding: [10, 10] });

        setTimeout(() => {
          map.invalidateSize();
          if (!staticView) {
            const geoBounds = L.geoJSON(boundariesData).getBounds();
            map.fitBounds(geoBounds, { animate: false, padding: [20, 20] });
          }
          const fittedZoom = map.getZoom();
          currentZoomRef.current = fittedZoom;
          map.setMinZoom(fittedZoom);
        }, 100);

        L.svg({ padding: 0.2 }).addTo(map);

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
              mapInstance.current.invalidateSize();
              if (!staticView) {
                const geoBounds = L.geoJSON(boundariesData).getBounds();
                mapInstance.current.fitBounds(geoBounds, {
                  animate: false,
                  padding: [20, 20],
                });
              }
              const fittedZoom = mapInstance.current.getZoom();
              if (fittedZoom !== currentZoomRef.current) {
                currentZoomRef.current = fittedZoom;
                mapInstance.current.setMinZoom(fittedZoom);
              }
            } else {
              requestAnimationFrame(waitAndResize);
            }
          };
          waitAndResize();
        };

        window.addEventListener("resize", handleResize);
        cleanupFn = () => window.removeEventListener("resize", handleResize);

        updateGeoJsonLayer();
        clearAndAddMarkers();
      });
    } else {
      updateGeoJsonLayer();
      clearAndAddMarkers();
    }

    return () => {
      cancelled = true;
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
    bounds,
    center,
    boundariesData,
    regionNameKey,
    staticView,
  ]);

  const prevSelectedCounties = useRef(selectedCounties);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (
      selectedCounties.length === 1 &&
      selectedCounties[0] === "All" &&
      prevSelectedCounties.current[0] !== "All"
    ) {
      const geoBounds = L.geoJSON(boundariesData).getBounds();
      mapInstance.current.fitBounds(geoBounds, { padding: [20, 20] });
    }

    if (selectedCounties[0] !== "All") {
      const countyName = selectedCounties[0];
      const feature = boundariesData.features.find(
        (f) => f.properties[regionNameKey] === countyName,
      );

      if (feature) {
        const featureBounds = L.geoJSON(feature).getBounds();
        mapInstance.current.fitBounds(featureBounds);

        const countyData = infoRef.current?.countyCounts?.[countyName] || {
          total: 0,
          Cluster_ID: {},
        };
        onInfoUpdate(generateInfoContent(countyName, countyData));
      }
    }

    prevSelectedCounties.current = selectedCounties;
  }, [
    selectedCounties,
    infoRef,
    onInfoUpdate,
    bounds,
    boundariesData,
    regionNameKey,
  ]);

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
      />
    </div>
  );
};

export default Map;
