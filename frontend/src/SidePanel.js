import React, { useState } from "react";
import "./css/SidePanel.css";
import { SelectButton } from "primereact/selectbutton";
import { Dropdown } from "primereact/dropdown";
import generateLegendItems from "./Legend";
import { Slider } from "primereact/slider";
import { colorOptions } from "./MapColor";

const SidePanel = ({
  activeTab,
  isOpen,
  toggleTab,
  filteredData,
  handleColorChange,
  markerSize,
  setMarkerSize,
}) => {
  const [selectedColor, setSelectedColor] = useState("green");

  const options = [
    { label: "Legend", value: "legend" },
    { label: "Map Settings", value: "MapSettings" },
  ];
  const panelStyles = {
    width: isOpen ? "200px" : "0",
    transition: "width 0.3s ease",
  };

  const renderContent = () => {
    switch (activeTab) {
      case "legend":
        const legendItems = generateLegendItems(filteredData);
        return (
          <div className="panel-content">
            <h3>Legend</h3>
            {legendItems.map((item, index) => (
              <div className="legend-item" key={index}>
                <div
                  className="legend-circle"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        );
      case "MapSettings":
        return (
          <div className="panel-content">
            <h3>Map Settings</h3>
            <p>Map Color</p>
            <Dropdown
              value={selectedColor}
              options={colorOptions}
              onChange={(e) => {
                setSelectedColor(e.value);
                handleColorChange(e.value);
              }}
              placeholder={`Selected color: ${selectedColor}`}
            />
            <p>Marker Size</p>
            <Slider
              value={markerSize}
              onChange={(e) => setMarkerSize(e.value)}
              min={3}
              max={8}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="side-panel-container">
      <div className="tab-buttons">
        <SelectButton
          value={activeTab}
          options={options}
          onChange={(e) => toggleTab(e.value)}
          className="p-button-sm"
        />
      </div>
      <div
        className={`side-panel ${isOpen ? "open" : "closed"}`}
        style={panelStyles}
      >
        {renderContent()}
        <div
          className="resize-handle"
          onMouseDown={(e) => e.preventDefault()}
        ></div>
      </div>
    </div>
  );
};

export default SidePanel;

