export function generateInfoContent(countyName, countyData) {
  const hasEntries = countyData && countyData.total > 0;

  return `
    <h1>${countyName}</h1>
    ${hasEntries ? `<b>Total cases: ${countyData.total}</b>` : ""}
    ${
      hasEntries
        ? Object.entries(countyData.ST || {})
            .map(([ST, count]) => `<p>ST ${ST}: ${count}</p>`)
            .join("")
        : ""
    }
  `;
}

