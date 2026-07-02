function isSingletonId(id) {
  return (
    !id || id === "Unknown" || String(id).toLowerCase().includes("singleton")
  );
}

export function generateInfoContent(countyName, countyData) {
  const hasEntries = countyData && countyData.total > 0;

  if (!hasEntries) return `<h1>${countyName}</h1>`;

  const entries = Object.entries(countyData.Cluster_ID || {});
  let singletonTotal = 0;
  const clusterLines = [];

  for (const [id, count] of entries) {
    if (isSingletonId(id)) {
      singletonTotal += count;
    } else {
      clusterLines.push(`<p> ${id}: ${count}</p>`);
    }
  }

  if (singletonTotal > 0) {
    clusterLines.push(`<p> Singletons: ${singletonTotal}</p>`);
  }

  return `
    <h1>${countyName}</h1>
    <b>Total cases: ${countyData.total}</b>
    ${clusterLines.join("")}
  `;
}
