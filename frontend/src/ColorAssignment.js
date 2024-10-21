import colorPalette from './ColorPalette'; 

const DEFAULT_COLOR = "#D3D3D3"; 
let STCountMap = new Map();

const hashSTToColorIndex = (ST) => {
  let hash = 0;
  for (let i = 0; i < ST.length; i++) {
    hash = ST.charCodeAt(i) + ((hash << 5) - hash); 
  }
  return Math.abs(hash) % colorPalette.length; 
};

export const countOccurrences = (data) => {
  STCountMap.clear();
  data.forEach(item => {
    const ST = item.properties.ST;
    if (ST) {
      let count = STCountMap.get(ST) || 0;
      STCountMap.set(ST, count + 1);
    }
  });
};

export const getColor = (ST) => {
  const count = STCountMap.get(ST) || 0;

  if (count >= 2) {
    const colorIndex = hashSTToColorIndex(ST.toString()); 
    return colorPalette[colorIndex];
  }

  return DEFAULT_COLOR;
};

