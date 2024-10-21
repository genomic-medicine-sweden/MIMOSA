import { getColor } from "./ColorAssignment";

const DEFAULT_COLOR = "#D3D3D3"; 

const generateLegendItems = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const uniqueST = [...new Set(data.map((item) => item.properties.ST))];

  const legendItems = uniqueST.map((ST) => {
    const color = getColor(ST);
    return {
      value: ST,
      label: `${ST}`,
      color: color,
    };
  });

  return legendItems.filter(item => item.color !== DEFAULT_COLOR);
};

export default generateLegendItems;

