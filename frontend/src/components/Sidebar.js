import React, { useState, useEffect } from "react";
import { Sidebar } from "primereact/sidebar";
import { Button } from "primereact/button";
import { Fieldset } from "primereact/fieldset";
import { BsGithub } from "react-icons/bs";
import ReactMarkdown from "react-markdown";
import "@/styles/Sidebar.css";

const SidebarComponent = () => {
  const [visible, setVisible] = useState(false);
  const [mimosaInfo, setMimosaInfo] = useState("");
  const [resources, setResources] = useState([]);
  const [collapsedState, setCollapsedState] = useState([]);

  useEffect(() => {
    fetch("/mimosa-info.md")
      .then((response) => response.text())
      .then(setMimosaInfo)
      .catch((err) => console.error("Failed to load mimosa-info.md", err));
  }, []);

  useEffect(() => {
    fetch("/resources.json")
      .then((response) => response.json())
      .then(setResources)
      .catch((err) => console.error("Failed to load resources.json", err));
  }, []);

  useEffect(() => {
    setCollapsedState([true, true]);
  }, []);

  const toggleCollapsed = (index) => {
    setCollapsedState((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "auto";
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
          <img
            src="/MIMOSA_Full_Logo.svg"
            alt="MIMOSA logo"
            style={{
              display: "block",
              maxWidth: "100%",
              height: "auto",
              margin: "0 auto",
            }}
          />
        </div>

        <div className="scrollable-content">
          <Fieldset
            legend="Info"
            toggleable
            collapsed={collapsedState[0]}
            onToggle={() => toggleCollapsed(0)}
            className="fieldset-content"
          >
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "blue" }}
                  />
                ),
              }}
            >
              {mimosaInfo}
            </ReactMarkdown>
          </Fieldset>

          <div style={{ marginTop: "20px" }} />

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
              {resources.map((resource) => (
                <a
                  key={resource.url}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", color: "blue" }}
                >
                  {resource.label}
                </a>
              ))}
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
