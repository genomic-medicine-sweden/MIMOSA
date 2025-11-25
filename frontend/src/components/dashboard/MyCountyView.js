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
  const [showFallback, setShowFallback] = useState(false);

  const infoRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const county = parsed.homeCounty;
        setSelectedCounty(county);
        setCountyFilter([county]);
      } catch (err) {
        console.warn("Could not parse user from localStorage:", err);
      }
    }
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!selectedCounty && showFallback) {
    return (
      <p className="text-lg font-semibold text-red-700">
        No home county set. Please go to Settings to select one.
      </p>
    );
  }

  if (!selectedCounty) {
    return null;
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
