import {
  formatPostcode,
  getCounty,
  getPostalTown,
} from "@/utils/locationUtils";

const SKIP_KEYS = new Set([
  "QC_Status",
  "Pipeline_Version",
  "Pipeline_Date",
  "analysis_profile",
  "alleles",
  "source",
]);

export const isSingleton = (id) =>
  String(id).toLowerCase().includes("singleton");
export const clusterDisplayLabel = (id) =>
  isSingleton(id) ? "Singleton" : String(id);

export function getMetadata(item) {
  const props = item?.properties;
  if (!props) return {};

  const result = {};
  const add = (key, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      result[key] = String(value);
    }
  };

  Object.entries(props).forEach(([key, value]) => {
    if (!SKIP_KEYS.has(key) && key !== "typing") add(key, value);
  });

  if (props.typing && typeof props.typing === "object") {
    Object.entries(props.typing).forEach(([key, value]) => {
      if (key !== "alleles") add(key, value);
    });
  }

  if (props.PostCode) {
    result.PostCode = formatPostcode(props.PostCode);
    const county = getCounty(props.PostCode);
    const town = getPostalTown(props.PostCode);
    if (county) result.County = county;
    if (town) result["Postal Town"] = town;
  }

  return result;
}

export function matchesLocationFilters(
  meta,
  { selectedHospitals, selectedCounties, selectedTowns },
) {
  if (selectedHospitals.length && !selectedHospitals.includes(meta.Hospital))
    return false;
  if (selectedCounties.length && !selectedCounties.includes(meta.County))
    return false;
  if (selectedTowns.length && !selectedTowns.includes(meta["Postal Town"]))
    return false;
  return true;
}

function toUTCDate(date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

function isoWeekYear(date) {
  const d = toUTCDate(date);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

function isoWeek(date) {
  const d = toUTCDate(date);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function bucketKey(date, resolution) {
  const y = date.getFullYear();
  if (resolution === "weekly")
    return `${isoWeekYear(date)}-W${String(isoWeek(date)).padStart(2, "0")}`;
  if (resolution === "quarterly")
    return `${y}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  return `${y}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function bucketLabel(key, resolution) {
  if (resolution === "weekly") {
    const [y, w] = key.split("-W");
    return `W${w} ${y}`;
  }
  if (resolution === "quarterly") {
    const [y, q] = key.split("-");
    return `${q} ${y}`;
  }
  const [y, m] = key.split("-");
  const mon = new Date(+y, +m - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
  });
  return `${mon} ${y}`;
}

export function buildChartLabels(allKeys, resolution) {
  const seenYears = new Set();
  return allKeys.map((key) => {
    let period, year;
    if (resolution === "weekly") {
      const [y, w] = key.split("-W");
      [period, year] = [`W${w}`, y];
    } else if (resolution === "quarterly") {
      const [y, q] = key.split("-");
      [period, year] = [q, y];
    } else {
      const [y, m] = key.split("-");
      period = new Date(+y, +m - 1, 1).toLocaleDateString("en-GB", {
        month: "short",
      });
      year = y;
    }
    const showYear = !seenYears.has(year);
    if (showYear) seenYears.add(year);
    return showYear ? [period, year] : [period, ""];
  });
}
