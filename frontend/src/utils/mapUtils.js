import L from "leaflet";

export function pickZoom(zoom) {
  const width = window.innerWidth;
  if (width < 768) return zoom.mobile;
  if (width < 1300) return zoom.small;
  if (width > 2300) return zoom.large;
  return zoom.default;
}

export function getInitialBounds(
  staticView,
  selectedCounties,
  { bounds, boundariesData, regionNameKey },
) {
  if (
    staticView &&
    selectedCounties.length === 1 &&
    selectedCounties[0] !== "All"
  ) {
    const feature = boundariesData.features.find(
      (f) => f.properties[regionNameKey] === selectedCounties[0],
    );
    if (feature) {
      return L.geoJSON(feature).getBounds();
    }
  }
  return bounds;
}
