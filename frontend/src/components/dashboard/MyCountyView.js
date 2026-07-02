"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import FilteringLogic from "@/components/FilteringLogic";
import Map from "@/components/Map";
import { Dropdown } from "primereact/dropdown";

export default function MyCountyView({ data }) {
  const [filteredData, setFilteredData] = useState([]);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [countyFilter, setCountyFilter] = useState([]);
  const [hospitalView, setHospitalView] = useState(false);
  const [mapColor, setMapColor] = useState("green");
  const [markerSize, setMarkerSize] = useState(6);

  const [analysisProfile, setAnalysisProfile] = useState(null);

  const infoRef = useRef(null);

  const analysisProfiles = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return [
      ...new Set(
        data.map((item) => item?.properties?.analysis_profile).filter(Boolean),
      ),
    ];
  }, [data]);

  useEffect(() => {
    if (!analysisProfile && analysisProfiles.length > 0) {
      setAnalysisProfile(analysisProfiles[0]);
    }
  }, [analysisProfiles, analysisProfile]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return;

    try {
      const parsed = JSON.parse(storedUser);
      const county = parsed?.homeCounty;

      if (typeof county === "string" && county.trim() !== "") {
        setSelectedCounty(county);
        setCountyFilter([county]);
      } else {
        setSelectedCounty(null);
        setCountyFilter([]);
      }
    } catch (err) {
      console.warn("Could not parse user from localStorage:", err);
      setSelectedCounty(null);
      setCountyFilter([]);
    }
  }, []);

  if (selectedCounty === null) {
    return (
      <div className="p-4">
        <p className="text-lg font-semibold text-red-700">
          No home county set.
        </p>
        <p className="text-lg font-semibold text-red-700">
          Please go to Settings to select one.
        </p>
      </div>
    );
  }

  return (
    <>
      {analysisProfiles.length > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          <Dropdown
            value={analysisProfile}
            options={analysisProfiles.map((p) => ({
              label: p.replace(/_/g, " "),
              value: p,
            }))}
            onChange={(e) => setAnalysisProfile(e.value)}
            placeholder="Select analysis profile"
            style={{ width: "100%" }}
          />
        </div>
      )}

      <div style={{ display: "none" }}>
        <FilteringLogic
          data={data}
          setFilteredData={setFilteredData}
          hospitalView={hospitalView}
          toggleHospitalView={() => {}}
          selectedCounty={[selectedCounty]}
          countyFilter={countyFilter}
          setCountyFilter={setCountyFilter}
          dateRange={null}
          setDateRange={() => {}}
          analysisProfile={analysisProfile}
          setAnalysisProfile={setAnalysisProfile}
        />
      </div>

      <Map
        filteredData={filteredData}
        hospitalView={hospitalView}
        mapColor={mapColor}
        markerSize={markerSize}
        onInfoUpdate={() => {}}
        onOutbreakUpdate={() => {}}
        selectedCounties={countyFilter}
        infoRef={infoRef}
        countyFilter={countyFilter}
        staticView={true}
      />
    </>
  );
}
