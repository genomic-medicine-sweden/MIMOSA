import React, { useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import FilteringLogic from "@/components/FilteringLogic";
import Table from "@/components/Table";
import Timeline from "@/components/Timeline";
import { Fieldset } from "primereact/fieldset";
import SidebarComponent from "@/components/Sidebar";
import "@/styles/App.css";
import SidePanel from "@/components/SidePanel";
import ImageExport from "@/components/export/ImageExport";
import { generateInfoContent } from "@/utils/info";
import { computeOutbreaks } from "@/utils/outbreakDetection";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const App = ({ data, similarity, dateRange, setDateRange, logs }) => {
  const [filteredData, setFilteredData] = useState(data);
  const [hospitalView, setHospitalView] = useState(true);
  const [mapColor, setMapColor] = useState("green");
  const [markerSize, setMarkerSize] = useState(6);
  const [activeTab, setActiveTab] = useState(null);
  const [infoContent, setInfoContent] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("All");
  const [countyFilter, setCountyFilter] = useState([]);
  const [visualisedData, setVisualisedData] = useState([]);

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

  const outbreaks = useMemo(() => {
    return computeOutbreaks(filteredData, hospitalView);
  }, [filteredData, hospitalView]);

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
            data={data}
            setFilteredData={setFilteredData}
            hospitalView={hospitalView}
            toggleHospitalView={toggleHospitalView}
            selectedCounty={selectedCounty}
            countyFilter={countyFilter}
            setCountyFilter={setCountyFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
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
          outbreaks={outbreaks} // ← added
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
