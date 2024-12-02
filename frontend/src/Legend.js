import { getColor } from "./ColorAssignment";

const DEFAULT_COLOR = "#D3D3D3";

const generateLegendItems = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const uniqueSTProfiles = new Set(data.map(item => `${item.properties.ST}-${item.properties.analysis_profile}`));

  const legendItems = Array.from(uniqueSTProfiles).map((profile) => {
    const [ST, analysis_profile] = profile.split("-");
    const color = getColor(ST, analysis_profile);
    return {
      value: ST,
      label: `${ST}`,
      color: color,
    };
  });

  return legendItems.filter(item => item.color !== DEFAULT_COLOR);
};

export default generateLegendItems;
