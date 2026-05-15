import React, { useState } from "react";
import "@/styles/SidePanel.css";
import { SelectButton } from "primereact/selectbutton";
import { Dropdown } from "primereact/dropdown";
import { Slider } from "primereact/slider";
import { InputSwitch } from "primereact/inputswitch";
import generateLegendItems, {
  generateShapeLegendItems,
} from "@/components/Legend";
import { colorOptions } from "@/utils/MapColor";
import { SHAPE_SVG } from "@/utils/markerUtils";
import { useMapConfigContext } from "@/components/AppWrapper";
import OutbreakAlert from "@/components/OutbreakAlert";

const SidePanel = ({
  activeTab,
  isOpen,
  toggleTab,
  filteredData,
  handleColorChange,
  markerSize,
  setMarkerSize,
  selectedCounty,
  setSelectedCounty,
  onCountySelect,
  outbreaks,
  shapeByPlatform,
  setShapeByPlatform,
}) => {
  const { boundariesData, regionNameKey } = useMapConfigContext();
  const [selectedColor, setSelectedColor] = useState("Green");

  const options = [
    { label: "Legend", value: "legend" },
    { label: "Map Settings", value: "MapSettings" },
  ];

  const counties = [
    { label: "All", value: "All" },
    ...boundariesData.features.map((feature) => ({
      label: feature.properties[regionNameKey],
      value: feature.properties[regionNameKey],
    })),
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "legend": {
        const legendItems = generateLegendItems(filteredData);
        const shapeLegendItems = generateShapeLegendItems(filteredData);
        return (
          <div className="panel-content">
            <h3>Legend</h3>
            {legendItems.map((item, index) => (
              <div className="legend-item" key={index}>
                <div
                  className="legend-circle"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
              </div>
            ))}

            {shapeByPlatform && (
              <>
                <h4 style={{ marginTop: "1rem" }}>Cluster</h4>
                <div className="legend-item">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      fill="#FFF"
                      stroke="black"
                      strokeWidth="1"
                    />
                  </svg>
                  <span style={{ marginLeft: "0.5rem" }}>Single platform</span>
                </div>
                <div className="legend-item">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="8"
                      cy="8"
                      r="6"
                      fill="#FFF"
                      stroke="black"
                      strokeWidth="1.5"
                      strokeDasharray="3,4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span style={{ marginLeft: "0.5rem" }}>Mixed platforms</span>
                </div>
              </>
            )}

            {shapeByPlatform && shapeLegendItems.length > 0 && (
              <>
                <h4 style={{ marginTop: "1rem" }}>Sequencing Platform</h4>
                {shapeLegendItems.map((item, index) => (
                  <div className="legend-item" key={index}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      xmlns="http://www.w3.org/2000/svg"
                      dangerouslySetInnerHTML={{
                        __html: SHAPE_SVG[item.shape](16),
                      }}
                    />
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        textTransform: "capitalize",
                      }}
                    >
                      {item.platform}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      }

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
              placeholder={selectedColor}
            />

            <p>Marker Size</p>
            <Slider
              value={markerSize}
              onChange={(e) => setMarkerSize(e.value)}
              min={3}
              max={8}
            />

            <p>County</p>
            <Dropdown
              value={selectedCounty}
              options={counties}
              onChange={(e) => {
                setSelectedCounty(e.value);
                onCountySelect(e.value);
              }}
              placeholder="Select a County"
              className="county-dropdown"
            />

            <p>Differentiate by Sequencing Platform</p>
            <InputSwitch
              checked={shapeByPlatform}
              onChange={(e) => setShapeByPlatform(e.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="side-panel-container">
      <div className="outbreak-container">
        <OutbreakAlert outbreaks={outbreaks} />
      </div>

      <div className="side-panel-body">
        <div className="tab-buttons">
          <SelectButton
            value={activeTab}
            options={options}
            onChange={(e) => toggleTab(e.value)}
            className="p-button-sm"
          />
        </div>

        <div className={`side-panel ${isOpen ? "open" : "closed"}`}>
          {renderContent()}
          <div
            className="resize-handle"
            onMouseDown={(e) => e.preventDefault()}
          />
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
