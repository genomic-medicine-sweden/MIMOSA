import L from "leaflet";

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
