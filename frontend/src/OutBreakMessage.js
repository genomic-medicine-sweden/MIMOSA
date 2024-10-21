export function generateOutbreakMessage(countyCounts) {
  const STOccurrences = {};


  Object.entries(countyCounts).forEach(([countyName, countyData]) => {
    Object.entries(countyData.ST || {}).forEach(([ST, count]) => {
      STOccurrences[ST] = (STOccurrences[ST] || 0) + count;
    });
  });


  const outbreakSTs = Object.entries(STOccurrences).filter(
    ([ST, count]) => count >= 2
  );


  if (outbreakSTs.length > 0) {
    return `<div style="color: black; padding: 4px; border-radius: 2px;">
                <h2>Outbreak Alert!</h2>
                ${outbreakSTs
                  .map(
                    ([ST, count]) =>
                      `<p>There are multiple occurences of ST ${ST} with a total of ${count} cases.</p>`
                  )
                  .join("")}
              </div>`;
  }

  return ""; 
}


