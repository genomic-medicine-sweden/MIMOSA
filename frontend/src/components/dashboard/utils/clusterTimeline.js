import { useMemo } from "react";

export function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatMonthYear(date) {
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function useClusterStats(samples, metaMap) {
  return useMemo(() => {
    const dated = samples
      .map((id) => ({ id, date: parseDate(metaMap[id]?.Date) }))
      .filter((s) => s.date !== null)
      .sort((a, b) => a.date - b.date);

    if (dated.length === 0) return null;

    const firstEntry = dated[0];
    const lastEntry = dated[dated.length - 1];

    const durationMonths =
      (lastEntry.date.getFullYear() - firstEntry.date.getFullYear()) * 12 +
      (lastEntry.date.getMonth() - firstEntry.date.getMonth());

    const counts = {};
    dated.forEach(({ date }) => {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    const peakKey = Object.entries(counts).reduce(
      (max, [key, count]) => (count > max.count ? { key, count } : max),
      { key: null, count: 0 },
    );
    const peakDate = peakKey.key
      ? new Date(
          parseInt(peakKey.key.split("-")[0]),
          parseInt(peakKey.key.split("-")[1]) - 1,
          1,
        )
      : null;

    const firstMeta = metaMap[firstEntry.id] ?? {};
    const lastMeta = metaMap[lastEntry.id] ?? {};

    return {
      firstDate: firstEntry.date,
      lastDate: lastEntry.date,
      durationMonths,
      datedCount: dated.length,
      totalCount: samples.length,
      peakDate,
      peakCount: peakKey.count,
      firstHospital: firstMeta.Hospital || null,
      firstCounty: firstMeta.County || null,
      lastHospital: lastMeta.Hospital || null,
      lastCounty: lastMeta.County || null,
      datedSamples: dated.map(({ id, date }) => ({
        id,
        date,
        hospital: (metaMap[id] ?? {}).Hospital || null,
        county: (metaMap[id] ?? {}).County || null,
      })),
    };
  }, [samples, metaMap]);
}

export function StatBox({ label, value }) {
  return (
    <div
      style={{
        background: "#f8f8f8",
        borderRadius: "4px",
        padding: "8px 10px",
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "#aaa",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "#222",
          fontFamily: "monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatLocation(hospital, county) {
  if (hospital && county) return `${hospital}, ${county}`;
  return hospital || county || null;
}

function buildEvents(stats, detailed) {
  if (!detailed) {
    const events = [];
    events.push({
      date: formatMonthYear(stats.firstDate),
      title: "First case detected",
      detail: null,
      color: "#42a5f5",
    });
    if (
      stats.peakDate &&
      stats.peakCount > 1 &&
      formatMonthYear(stats.peakDate) !== formatMonthYear(stats.firstDate) &&
      formatMonthYear(stats.peakDate) !== formatMonthYear(stats.lastDate)
    ) {
      events.push({
        date: formatMonthYear(stats.peakDate),
        title: "Peak activity",
        detail: `${stats.peakCount} cases`,
        color: "#ffa726",
      });
    }
    events.push({
      date: formatMonthYear(stats.lastDate),
      title: "Most recent case",
      detail: null,
      color: "#66bb6a",
    });
    return events;
  }

  const events = [];
  const seenHospitals = new Set();
  const seenCounties = new Set();

  stats.datedSamples.forEach(({ date, hospital, county }, i) => {
    const isFirst = i === 0;
    const isLast = i === stats.datedSamples.length - 1;
    const newHospital = hospital && !seenHospitals.has(hospital);
    const newCounty = county && !seenCounties.has(county);

    if (hospital) seenHospitals.add(hospital);
    if (county) seenCounties.add(county);

    if (!isFirst && !isLast && !newHospital && !newCounty) return;

    events.push({
      date: formatMonthYear(date),
      title: isFirst
        ? "First case detected"
        : isLast
          ? "Most recent case"
          : "New location",
      detail: formatLocation(hospital, county),
      color: isFirst ? "#42a5f5" : isLast ? "#66bb6a" : "#ab47bc",
    });
  });

  return events;
}

function EventTimeline({ stats, detailed }) {
  const events = buildEvents(stats, detailed);
  return (
    <div style={{ marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#bbb",
          marginBottom: "8px",
        }}
      >
        Key Events
      </div>
      <div
        style={{
          paddingLeft: "14px",
          borderLeft: "2px solid #f0f0f0",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {events.map((ev, i) => (
          <div
            key={i}
            style={{ position: "relative", display: "flex", gap: "10px" }}
          >
            <div
              style={{
                position: "absolute",
                left: "-19px",
                top: "4px",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: ev.color,
                border: `1px solid ${ev.color}`,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                fontWeight: 600,
                color: "#666",
                minWidth: "76px",
                paddingTop: "1px",
              }}
            >
              {ev.date}
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#333" }}>
                {ev.title}
              </div>
              {ev.detail && (
                <div
                  style={{ fontSize: "11px", color: "#999", marginTop: "1px" }}
                >
                  {ev.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KeyEvents({ stats }) {
  return <EventTimeline stats={stats} detailed={false} />;
}

export function KeyEventsDetailed({ stats }) {
  return <EventTimeline stats={stats} detailed={true} />;
}

export function TimelineSection({ stats, totalCount }) {
  if (!stats) {
    return (
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #f0f0f0",
          fontSize: "11px",
          color: "#ccc",
          fontStyle: "italic",
        }}
      >
        No collection dates available for this cluster.
      </div>
    );
  }

  const durationLabel =
    stats.durationMonths < 1
      ? "< 1 month"
      : stats.durationMonths === 1
        ? "1 month"
        : `${stats.durationMonths} months`;

  const missingDates = (totalCount ?? stats.totalCount) - stats.datedCount;

  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        <StatBox label="First case" value={formatMonthYear(stats.firstDate)} />
        <StatBox label="Last case" value={formatMonthYear(stats.lastDate)} />
        <StatBox label="Duration" value={durationLabel} />
      </div>

      <KeyEvents stats={stats} />

      {missingDates > 0 && (
        <div
          style={{
            fontSize: "10px",
            color: "#ccc",
            fontStyle: "italic",
            marginTop: "4px",
          }}
        >
          {missingDates} sample{missingDates !== 1 ? "s" : ""} without
          collection date
        </div>
      )}
    </div>
  );
}
