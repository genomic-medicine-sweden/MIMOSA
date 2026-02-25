"use client";

import { useEffect, useState, useRef } from "react";
import FilteringLogic from "@/components/FilteringLogic";
import Map from "@/components/Map";

export default function MyCountyView({ data }) {
  const [filteredData, setFilteredData] = useState([]);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [countyFilter, setCountyFilter] = useState([]);
  const [hospitalView, setHospitalView] = useState(false);
  const [mapColor, setMapColor] = useState("green");
  const [markerSize, setMarkerSize] = useState(6);

  const infoRef = useRef(null);

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
      <div style={{ display: "none" }}>
        <FilteringLogic
          data={data}
          setFilteredData={setFilteredData}
          hospitalView={hospitalView}
          toggleHospitalView={() => {}}
          selectedCounty={selectedCounty}
          countyFilter={countyFilter}
          setCountyFilter={setCountyFilter}
          dateRange={null}
          setDateRange={() => {}}
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
