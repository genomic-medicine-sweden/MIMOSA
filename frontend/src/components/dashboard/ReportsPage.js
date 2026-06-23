"use client";

import { useState, useMemo } from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { FloatLabel } from "primereact/floatlabel";

import useAppData from "@/hooks/useAppData";
import useAnalysisProfiles from "@/hooks/useAnalysisProfiles";
import { useMapConfigContext } from "@/components/AppWrapper";
import { getPostcodeCoordinates } from "@/utils/coordinates";
import { apiFetch } from "@/utils/apiFetch";

const pdfStyles = StyleSheet.create({
  page: { padding: 0, fontSize: 10, fontFamily: "Helvetica", color: "#222" },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderBottom: "1px solid #e0e0e0",
  },
  headerLogo: { height: 100, objectFit: "contain" },
  body: { padding: 40, paddingTop: 24 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 20 },
  metaBlock: { marginBottom: 20 },
  metaRow: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { fontFamily: "Helvetica-Bold", width: 90 },
  metaValue: { flex: 1 },
  profileHeading: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottom: "2px solid #aaaaaa",
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: "1px solid #cccccc",
  },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #eeeeee" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #cccccc",
    backgroundColor: "#f0f0f0",
  },
  cell: { padding: "4px 6px" },
  cellText: { fontSize: 9 },
  cellBold: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  noData: { fontSize: 9, color: "#999999", fontStyle: "italic", marginTop: 4 },
});

const CLUSTER_COLS = [
  { label: "Cluster ID", flex: 1.2 },
  { label: "Samples", flex: 0.7 },
  { label: "Hospitals", flex: 2 },
  { label: "Counties", flex: 1.5 },
  { label: "First Case", flex: 1 },
  { label: "Last Case", flex: 1 },
];

const OUTBREAK_COLS = [
  { label: "Cluster ID", flex: 1 },
  { label: "Cases", flex: 0.6 },
  { label: "Counties", flex: 1.8 },
  { label: "First Alert", flex: 1 },
  { label: "Last Growth", flex: 1 },
];

function PdfRow({ cells, cols, isHeader }) {
  const total = cols.reduce((s, c) => s + c.flex, 0);
  return (
    <View
      wrap={false}
      style={isHeader ? pdfStyles.tableHeaderRow : pdfStyles.tableRow}
    >
      {cells.map((cell, i) => (
        <View key={i} style={[pdfStyles.cell, { flex: cols[i].flex / total }]}>
          <Text style={isHeader ? pdfStyles.cellBold : pdfStyles.cellText}>
            {String(cell ?? "")}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ProfileSection({
  profile,
  outbreakRows,
  clusterRows,
  sections,
  showHeading,
}) {
  const showLastGrowth = outbreakRows.some((row) => {
    if (!row.lastGrowthAt || !row.firstDetectedAt) return false;
    return (
      new Date(row.lastGrowthAt).toISOString().slice(0, 10) !==
      new Date(row.firstDetectedAt).toISOString().slice(0, 10)
    );
  });

  const outbreakCols = showLastGrowth
    ? OUTBREAK_COLS
    : OUTBREAK_COLS.filter((c) => c.label !== "Last Growth");

  return (
    <View>
      {showHeading && (
        <Text style={pdfStyles.profileHeading}>
          {profile.replace(/_/g, " ")}
        </Text>
      )}

      {sections.outbreaks && (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Active Outbreaks</Text>
          <PdfRow
            cells={outbreakCols.map((c) => c.label)}
            cols={outbreakCols}
            isHeader
          />
          {outbreakRows.length === 0 ? (
            <Text style={pdfStyles.noData}>
              No active outbreaks for the selected profile.
            </Text>
          ) : (
            outbreakRows.map((row, i) => {
              const firstDate = row.firstDetectedAt
                ? new Date(row.firstDetectedAt).toISOString().slice(0, 10)
                : "";
              const lastDate = row.lastGrowthAt
                ? new Date(row.lastGrowthAt).toISOString().slice(0, 10)
                : "";
              const cells = [
                row.clusterId,
                row.total ?? "",
                (row.counties ?? [])
                  .map((c) => (typeof c === "string" ? c : c.county))
                  .join(", ") || "",
                firstDate,
              ];
              if (showLastGrowth)
                cells.push(lastDate !== firstDate ? lastDate : "");
              return <PdfRow key={i} cells={cells} cols={outbreakCols} />;
            })
          )}
        </View>
      )}

      {sections.clusters && (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Cluster Summary</Text>
          <PdfRow
            cells={CLUSTER_COLS.map((c) => c.label)}
            cols={CLUSTER_COLS}
            isHeader
          />
          {clusterRows.length === 0 ? (
            <Text style={pdfStyles.noData}>
              No clusters found for the selected filters.
            </Text>
          ) : (
            clusterRows.map((row, i) => (
              <PdfRow
                key={i}
                cells={[
                  row.id,
                  row.samples,
                  row.hospitals,
                  row.counties,
                  row.firstDate,
                  row.lastDate,
                ]}
                cols={CLUSTER_COLS}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

function ReportDocument({ meta, profileSections, sections, logoSrc }) {
  const today = new Date().toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          {logoSrc && <Image src={logoSrc} style={pdfStyles.headerLogo} />}
        </View>

        <View style={pdfStyles.body}>
          <Text style={pdfStyles.subtitle}>Generated {today}</Text>

          <View style={pdfStyles.metaBlock}>
            {meta.profiles?.length === 1 && (
              <View style={pdfStyles.metaRow}>
                <Text style={pdfStyles.metaLabel}>Profile:</Text>
                <Text style={pdfStyles.metaValue}>
                  {meta.profiles[0].replace(/_/g, " ")}
                </Text>
              </View>
            )}
            {meta.dateRange && (
              <View style={pdfStyles.metaRow}>
                <Text style={pdfStyles.metaLabel}>Date range:</Text>
                <Text style={pdfStyles.metaValue}>{meta.dateRange}</Text>
              </View>
            )}
            {meta.hospitals?.length > 0 && (
              <View style={pdfStyles.metaRow}>
                <Text style={pdfStyles.metaLabel}>Hospitals:</Text>
                <Text style={pdfStyles.metaValue}>
                  {meta.hospitals.join(", ")}
                </Text>
              </View>
            )}
            {meta.counties?.length > 0 && (
              <View style={pdfStyles.metaRow}>
                <Text style={pdfStyles.metaLabel}>Counties:</Text>
                <Text style={pdfStyles.metaValue}>
                  {meta.counties.join(", ")}
                </Text>
              </View>
            )}
          </View>

          {profileSections.map(({ profile, outbreakRows, clusterRows }) => (
            <ProfileSection
              key={profile}
              profile={profile}
              outbreakRows={outbreakRows}
              clusterRows={clusterRows}
              sections={sections}
              showHeading={profileSections.length > 1}
            />
          ))}
        </View>
      </Page>
    </Document>
  );
}

function buildClusterRows(data, profile, filters) {
  const {
    dateRange,
    hospitals: hospitalFilter,
    counties: countyFilter,
  } = filters;
  const postcodeCoordinates = getPostcodeCoordinates();
  const clusters = {};

  data
    .filter((d) => d.properties.analysis_profile === profile)
    .forEach((item) => {
      const {
        Cluster_ID,
        Hospital,
        PostCode,
        Date: sampleDate,
      } = item.properties;

      if (
        !Cluster_ID ||
        String(Cluster_ID).toLowerCase().includes("singleton") ||
        Cluster_ID === "Unknown"
      )
        return;

      if (dateRange?.[0]) {
        const d = new Date(sampleDate);
        d.setHours(0, 0, 0, 0);
        const start = new Date(dateRange[0]);
        start.setHours(0, 0, 0, 0);
        if (d < start) return;
        if (dateRange[1]) {
          const end = new Date(dateRange[1]);
          end.setHours(23, 59, 59, 999);
          if (d > end) return;
        }
      }

      const county = postcodeCoordinates?.[PostCode]?.County ?? "";
      if (hospitalFilter.length > 0 && !hospitalFilter.includes(Hospital))
        return;
      if (countyFilter.length > 0 && !countyFilter.includes(county)) return;

      const cid = String(Cluster_ID);
      if (!clusters[cid])
        clusters[cid] = {
          id: cid,
          samples: 0,
          hospitals: new Set(),
          counties: new Set(),
          dates: [],
        };

      clusters[cid].samples++;
      if (Hospital) clusters[cid].hospitals.add(Hospital);
      if (county) clusters[cid].counties.add(county);
      if (sampleDate) clusters[cid].dates.push(new Date(sampleDate));
    });

  return Object.values(clusters)
    .map((c) => ({
      id: c.id,
      samples: c.samples,
      hospitals: [...c.hospitals].join(", ") || "",
      counties: [...c.counties].join(", ") || "",
      firstDate: c.dates.length
        ? new Date(Math.min(...c.dates)).toISOString().slice(0, 10)
        : "",
      lastDate: c.dates.length
        ? new Date(Math.max(...c.dates)).toISOString().slice(0, 10)
        : "",
    }))
    .sort((a, b) => b.samples - a.samples);
}

export default function ReportsPage() {
  const { data } = useAppData();
  const analysisProfiles = useAnalysisProfiles(data);
  const { boundariesData, regionNameKey, hospitalCoordinates } =
    useMapConfigContext();

  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [selectedHospitals, setSelectedHospitals] = useState([]);
  const [selectedCounties, setSelectedCounties] = useState([]);
  const [sections, setSections] = useState({ clusters: true, outbreaks: true });
  const [generating, setGenerating] = useState(false);

  const hospitalOptions = useMemo(
    () =>
      Object.keys(hospitalCoordinates || {})
        .sort()
        .map((h) => ({ label: h, value: h })),
    [hospitalCoordinates],
  );

  const countyOptions = useMemo(() => {
    if (!boundariesData?.features) return [];
    return boundariesData.features
      .map((f) => f.properties[regionNameKey])
      .filter(Boolean)
      .sort()
      .map((c) => ({ label: c, value: c }));
  }, [boundariesData, regionNameKey]);

  const handleGenerate = async () => {
    if (!selectedProfiles.length) return;
    setGenerating(true);
    try {
      const logoSrc = `${window.location.origin}/MIMOSA_Full_Logo.png`;
      const apiBase = process.env.NEXT_PUBLIC_API_URL;

      const filters = {
        dateRange,
        hospitals: selectedHospitals,
        counties: selectedCounties,
      };

      const profileSections = await Promise.all(
        selectedProfiles.map(async (p) => {
          const clusterRows = sections.clusters
            ? buildClusterRows(data, p, filters)
            : [];

          const rawOutbreaks = sections.outbreaks
            ? await apiFetch(`${apiBase}/api/outbreaks?analysis_profile=${p}`)
                .then((r) => r.json())
                .catch(() => [])
            : [];

          const outbreakRows =
            selectedCounties.length > 0
              ? rawOutbreaks.filter((o) => {
                  const oc = (o.counties ?? []).map((c) =>
                    typeof c === "string" ? c : c.county,
                  );
                  return oc.some((c) => selectedCounties.includes(c));
                })
              : rawOutbreaks;

          return { profile: p, outbreakRows, clusterRows };
        }),
      );

      const formatDate = (d) =>
        d ? new Date(d).toISOString().slice(0, 10) : null;

      const meta = {
        profiles: selectedProfiles,
        dateRange: dateRange?.[0]
          ? `${formatDate(dateRange[0])} – ${formatDate(dateRange[1] ?? dateRange[0])}`
          : null,
        hospitals: selectedHospitals,
        counties: selectedCounties,
      };

      const blob = await pdf(
        <ReportDocument
          meta={meta}
          profileSections={profileSections}
          sections={sections}
          logoSrc={logoSrc}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MIMOSA_report_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate =
    selectedProfiles.length > 0 &&
    !generating &&
    (sections.clusters || sections.outbreaks);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-3xl font-semibold mb-4">Reports</h2>

      <div className="flex flex-column gap-4">
        <FloatLabel>
          <MultiSelect
            value={selectedProfiles}
            onChange={(e) => setSelectedProfiles(e.value)}
            options={analysisProfiles.map((p) => ({
              label: p.replace(/_/g, " "),
              value: p,
            }))}
            placeholder="Select profiles"
            maxSelectedLabels={2}
            style={{ width: "100%" }}
            filter
          />
          <label>Analysis Profile</label>
        </FloatLabel>

        <FloatLabel>
          <Calendar
            value={dateRange}
            onChange={(e) => setDateRange(e.value)}
            selectionMode="range"
            dateFormat="yy.mm.dd"
            maxDate={new Date()}
            showButtonBar
            style={{ width: "100%" }}
          />
          <label>Date Range (optional)</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={selectedHospitals}
            options={hospitalOptions}
            onChange={(e) => setSelectedHospitals(e.value)}
            placeholder="All hospitals"
            filter
            filterPlaceholder="Search"
            maxSelectedLabels={2}
            style={{ width: "100%" }}
          />
          <label>Hospital (optional)</label>
        </FloatLabel>

        <FloatLabel>
          <MultiSelect
            value={selectedCounties}
            options={countyOptions}
            onChange={(e) => setSelectedCounties(e.value)}
            placeholder="All counties"
            filter
            filterPlaceholder="Search"
            maxSelectedLabels={2}
            style={{ width: "100%" }}
          />
          <label>County (optional)</label>
        </FloatLabel>

        <div>
          <span className="font-medium">Sections to include</span>
          <div className="flex flex-column gap-2 mt-2">
            <div className="flex align-items-center gap-2">
              <Checkbox
                inputId="sec-outbreaks"
                checked={sections.outbreaks}
                onChange={(e) =>
                  setSections((s) => ({ ...s, outbreaks: e.checked }))
                }
              />
              <label htmlFor="sec-outbreaks">Active Outbreaks</label>
            </div>
            <div className="flex align-items-center gap-2">
              <Checkbox
                inputId="sec-clusters"
                checked={sections.clusters}
                onChange={(e) =>
                  setSections((s) => ({ ...s, clusters: e.checked }))
                }
              />
              <label htmlFor="sec-clusters">Cluster Summary</label>
            </div>
          </div>
        </div>

        <div>
          <Button
            label={generating ? "Generating..." : "Generate PDF"}
            icon={generating ? "pi pi-spin pi-spinner" : "pi pi-download"}
            onClick={handleGenerate}
            disabled={!canGenerate}
          />
        </div>
      </div>
    </div>
  );
}
