export function generateInfoContent(countyName, countyData) {
  const hasEntries = countyData && countyData.total > 0;

  return `
    <h1>${countyName}</h1>
    ${hasEntries ? `<b>Total cases: ${countyData.total}</b>` : ""}
    ${
      hasEntries
        ? Object.entries(countyData.Cluster_ID || {})
            .map(([Cluster_ID, count]) => `<p> ${Cluster_ID}: ${count}</p>`)
            .join("")
        : ""
    }
  `;
}

