import React, { useState, useEffect } from "react";
import { Sidebar } from "primereact/sidebar";
import { BsGithub } from "react-icons/bs";
import { Button } from "primereact/button";
import { Fieldset } from "primereact/fieldset";
import "./css/Sidebar.css";

const SidebarComponent = () => {
  const [visible, setVisible] = useState(false);
  const [MIMOSAInfo, setMIMOSAInfo] = useState("");
  const [collapsedState, setCollapsedState] = useState([]);

  useEffect(() => {
    fetch("/MIMOSAInfo.txt")
      .then((response) => response.text())
      .then((text) => setMIMOSAInfo(text));
  }, []);

  useEffect(() => {
    const initialState = Array.from({ length: 2 }, () => true);
    setCollapsedState(initialState);
  }, []);

  const toggleCollapsed = (index) => {
    const newCollapsedState = [...collapsedState];
    newCollapsedState[index] = !newCollapsedState[index];
    setCollapsedState(newCollapsedState);
  };

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [visible]);

  return (
    <div className="flex justify-content-end">
      <Button
        icon="pi pi-info"
        className="p-button-rounded"
        aria-label="Open Sidebar"
        onClick={() => setVisible(true)}
      />
      <Sidebar
        visible={visible}
        onHide={() => setVisible(false)}
        position="right"
        className="w-full md:w-20rem lg:w-30rem custom-sidebar"
      >
        <div className="sidebar-header">
          <h2 className="sidebar-title">MIMOSA</h2>
          <h3 className="sidebar-subtitle">
            Microbial Investigation,Monitoring,Outbreak Surveillance, and
            Analysis{" "}
          </h3>
        </div>
        <div className="scrollable-content">
          <Fieldset
            legend="Info"
            toggleable
            collapsed={collapsedState[0]}
            onToggle={() => toggleCollapsed(0)}
            className="fieldset-content"
          >
            <p>{MIMOSAInfo}</p>
          </Fieldset>
          <div style={{ marginTop: "20px" }}></div>
          <Fieldset
            legend="Resource Links"
            toggleable
            collapsed={collapsedState[1]}
            onToggle={() => toggleCollapsed(1)}
            className="fieldset-content"
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <div>
                <a
                  href="https://cartographyvectors.com/map/1521-sweden-with-regions"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", color: "blue" }}
                >
                  Sweden Boundaries
                </a>
              </div>
              <div>
                <a
                  href="https://www.geonames.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", color: "blue" }}
                >
                  Postcodes
                </a>
              </div>
            </div>
          </Fieldset>
        </div>
        <div className="fixed-area">
          <a
            className="navbar-brand"
            href="https://github.com/genomic-medicine-sweden/MIMOSA"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsGithub size={30} style={{ color: "black" }} />
          </a>
        </div>
      </Sidebar>
    </div>
  );
};

export default SidebarComponent;


