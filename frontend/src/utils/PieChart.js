import * as d3 from "d3";

const createPieChartSVG = (filteredData, markerSize, strokeWidth = 1) => {
  const radius = markerSize / 2;
  const width = 2 * (radius + strokeWidth);
  const height = 2 * (radius + strokeWidth);
  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("xmlns", "http://www.w3.org/2000/svg");

  const g = svg
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const pie = d3.pie().value((d) => d[0]);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  g.selectAll("path")
    .data(pie(filteredData))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d) => d.data[1])
    .attr("stroke", "black")
    .attr("stroke-width", strokeWidth);

  return svg.node().outerHTML;
};
export default createPieChartSVG;
