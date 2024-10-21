import React, { useState, useRef } from "react";
import FilteringLogic from "./FilteringLogic";
import Map from "./Map";
import Table from "./Table";
import Timeline from "./Timeline";
import { Fieldset } from "primereact/fieldset";
import SidebarComponent from "./Sidebar";
import "./css/App.css";
import SidePanel from "./SidePanel";
import ImageExport from "./ImageExport";

const App = ({ data, similarity }) => {
  const [filteredData, setFilteredData] = useState(data);
  const [hospitalView, setHospitalView] = useState(false);
  const [mapColor, setMapColor] = useState("green");
  const [markerSize, setMarkerSize] = useState(6);
  const [activeTab, setActiveTab] = useState(null);
  const [infoContent, setInfoContent] = useState("");

  const mainContentRef = useRef(null);

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

  const [outbreakMessage, setOutbreakMessage] = useState("");

  const handleOutbreakUpdate = (message) => {
    setOutbreakMessage(message);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>MIMOSA</h1>
        <SidebarComponent />
      </header>

      <nav className="nav">
        <div className="filtering-logic-container">
          <FilteringLogic
            data={data}
            setFilteredData={setFilteredData}
            hospitalView={hospitalView}
            toggleHospitalView={toggleHospitalView}
          />
        </div>
      </nav>

      <aside className="left-side-content">
        <SidePanel
          activeTab={activeTab}
          isOpen={activeTab !== null}
          toggleTab={toggleTab}
          filteredData={filteredData}
          handleColorChange={handleColorChange}
          markerSize={markerSize}
          setMarkerSize={setMarkerSize}
        />
      </aside>

      <main className="main-content" ref={mainContentRef}>
        <Map
          filteredData={filteredData}
          hospitalView={hospitalView}
          mapColor={mapColor}
          markerSize={markerSize}
          onInfoUpdate={handleInfoUpdate}
          onOutbreakUpdate={handleOutbreakUpdate}
        />
      </main>
      <aside className="left-side-content">
        {outbreakMessage && (
          <div
            className="outbreak-message"
            dangerouslySetInnerHTML={{ __html: outbreakMessage }}
          />
        )}
      </aside>
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
            <Table filteredData={filteredData} similarity={similarity} />
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

