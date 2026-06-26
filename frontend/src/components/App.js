import React, { useState, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import * as turf from "@turf/turf";
import FilteringLogic from "@/components/FilteringLogic";
import Table from "@/components/Table";
import Timeline from "@/components/Timeline";
import { Fieldset } from "primereact/fieldset";
import SidebarComponent from "@/components/Sidebar";
import "@/styles/App.css";
import SidePanel from "@/components/SidePanel";
import ImageExport from "@/components/export/ImageExport";
import { generateInfoContent } from "@/utils/info";
import useOutbreaks from "@/hooks/useOutbreaks";
import { useMapConfigContext } from "@/components/AppWrapper";
import { apiFetch } from "@/utils/apiFetch";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const App = ({
  data,
  similarity,
  dateRange,
  setDateRange,
  logs,
  dataVersion,
  clusteringByProfile,
}) => {
  const {
    postcodeCoordinates = {},
    hospitalCoordinates = {},
    boundariesData,
    postcodePrefix = "",
  } = useMapConfigContext();

  const countryData = useMemo(() => {
    if (!Array.isArray(data) || !boundariesData) return data ?? [];

    const resolvePostcodeKey = (pc) =>
      postcodeCoordinates[pc]
        ? pc
        : postcodeCoordinates[`${postcodePrefix}${pc}`]
          ? `${postcodePrefix}${pc}`
          : null;

    return data.filter((item) => {
      const { PostCode, Hospital, manualCoordinates } = item.properties;

      if (!PostCode?.trim() && manualCoordinates?.lat == null) return true;

      if (resolvePostcodeKey(PostCode)) return true;

      if (Hospital && hospitalCoordinates[Hospital]) {
        const hpc = hospitalCoordinates[Hospital].PostCode;
        if (resolvePostcodeKey(hpc)) return true;
      }

      if (manualCoordinates?.lat != null && manualCoordinates?.lng != null) {
        const lat = Number(manualCoordinates.lat);
        const lng = Number(manualCoordinates.lng);
        if (isNaN(lat) || isNaN(lng)) return false;
        const point = turf.point([lng, lat]);
        return boundariesData.features.some(
          (f) =>
            (f.geometry.type === "Polygon" ||
              f.geometry.type === "MultiPolygon") &&
            turf.booleanPointInPolygon(point, f),
        );
      }

      return false;
    });
  }, [
    data,
    postcodeCoordinates,
    hospitalCoordinates,
    boundariesData,
    postcodePrefix,
  ]);

  const [filteredData, setFilteredData] = useState(data);
  const [hospitalView, setHospitalView] = useState(true);
  const [mapColor, setMapColor] = useState("green");
  const [markerSize, setMarkerSize] = useState(6);
  const [activeTab, setActiveTab] = useState(null);
  const [infoContent, setInfoContent] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("All");
  const [countyFilter, setCountyFilter] = useState([]);
  const [visualisedData, setVisualisedData] = useState([]);
  const [analysisProfile, setAnalysisProfile] = useState(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (analysisProfile !== null) {
      localStorage.setItem("lastAnalysisProfile", analysisProfile);
    }
  }, [analysisProfile]);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!data || data.length === 0) return;

    hasInitializedRef.current = true;

    const profilesWithData = new Set(
      data.map((item) => item.properties.analysis_profile).filter(Boolean),
    );
    if (profilesWithData.size === 0) return;

    const pickFallback = () => {
      const stored = localStorage.getItem("lastAnalysisProfile");
      if (stored && profilesWithData.has(stored)) return stored;

      let latestProfile = null;
      let latestDate = null;
      for (const [profile, run] of Object.entries(clusteringByProfile ?? {})) {
        if (!profilesWithData.has(profile)) continue;
        const date = new Date(run.createdAt);
        if (!latestDate || date > latestDate) {
          latestDate = date;
          latestProfile = profile;
        }
      }
      if (latestProfile) return latestProfile;

      return [...profilesWithData][0];
    };

    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    apiFetch(`${apiBase}/api/outbreaks/active-profiles`)
      .then((res) => res.json())
      .then((activeProfiles) => {
        const activeWithData = Array.isArray(activeProfiles)
          ? activeProfiles.find((p) => profilesWithData.has(p))
          : null;
        setAnalysisProfile(activeWithData ?? pickFallback());
      })
      .catch(() => {
        setAnalysisProfile(pickFallback());
      });
  }, [data, clusteringByProfile]);

  const [shapeByPlatform, setShapeByPlatform] = useState(false);
  const [showClusters, setShowClusters] = useState(false);
  const [showOutbreaks, setShowOutbreaks] = useState(false);

  const mainContentRef = useRef(null);
  const infoRef = useRef({ countyCounts: {} });

  const toggleHospitalView = () => {
    setHospitalView((prev) => !prev);
  };

  const handleColorChange = (color) => {
    setMapColor(color);
  };

  const toggleTab = (tab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  };

  const handleInfoUpdate = (content) => {
    setInfoContent(content);
  };

  const handleCountySelect = (county) => {
    setSelectedCounty(county);

    const countyData = infoRef.current?.countyCounts?.[county] || {
      total: 0,
      Cluster_ID: {},
    };

    const content =
      county === "All" ? "" : generateInfoContent(county, countyData);

    setInfoContent(content);
  };

  const { outbreaks } = useOutbreaks(analysisProfile, dataVersion);
  return (
    <div className="container">
      <header className="header">
        <img
          src="/MIMOSA_simpletxt.svg"
          alt="MIMOSA"
          style={{
            display: "block",
            maxWidth: "auto",
            height: "135%",
            margin: "1 auto",
          }}
        />
        <SidebarComponent />
      </header>

      <nav className="nav">
        <div className="filtering-logic-container">
          <FilteringLogic
            data={countryData}
            setFilteredData={setFilteredData}
            hospitalView={hospitalView}
            toggleHospitalView={toggleHospitalView}
            selectedCounty={selectedCounty}
            countyFilter={countyFilter}
            setCountyFilter={setCountyFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            analysisProfile={analysisProfile}
            setAnalysisProfile={setAnalysisProfile}
            showClusters={showClusters}
            showOutbreaks={showOutbreaks}
            outbreaks={outbreaks}
          />
        </div>
      </nav>

      <aside className="left-side-content">
        <SidePanel
          activeTab={activeTab}
          isOpen={activeTab !== null}
          toggleTab={toggleTab}
          filteredData={visualisedData}
          handleColorChange={handleColorChange}
          markerSize={markerSize}
          setMarkerSize={setMarkerSize}
          selectedCounty={selectedCounty}
          setSelectedCounty={setSelectedCounty}
          onCountySelect={handleCountySelect}
          outbreaks={outbreaks}
          shapeByPlatform={shapeByPlatform}
          setShapeByPlatform={setShapeByPlatform}
          showClusters={showClusters}
          setShowClusters={setShowClusters}
          showOutbreaks={showOutbreaks}
          setShowOutbreaks={setShowOutbreaks}
        />
      </aside>

      <main className="main-content" ref={mainContentRef}>
        <Map
          key={typeof window !== "undefined" ? window.innerWidth : "static"}
          filteredData={filteredData}
          onVisualisedDataChange={setVisualisedData}
          hospitalView={hospitalView}
          mapColor={mapColor}
          markerSize={markerSize}
          onInfoUpdate={handleInfoUpdate}
          selectedCounties={selectedCounty ? [selectedCounty] : []}
          infoRef={infoRef}
          countyFilter={countyFilter}
          shapeByPlatform={shapeByPlatform}
        />
      </main>

      <aside className="right-side-content">
        <ImageExport mainContentRef={mainContentRef} />
        <div
          className="info-content"
          dangerouslySetInnerHTML={{ __html: infoContent }}
        />
      </aside>

      <footer className="footer">
        <div className="card pt-0">
          <Fieldset legend="Table" toggleable collapsed={true}>
            <Table
              filteredData={filteredData}
              similarity={similarity}
              dateRange={dateRange}
              logs={logs}
            />
          </Fieldset>
        </div>

        <div className="card pt-1">
          <Fieldset legend="Timeline" toggleable collapsed={true}>
            <Timeline filteredData={filteredData} />
          </Fieldset>
        </div>
      </footer>
    </div>
  );
};

export default App;
