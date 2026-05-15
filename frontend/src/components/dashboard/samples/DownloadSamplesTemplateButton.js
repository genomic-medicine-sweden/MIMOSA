"use client";

import { SplitButton } from "primereact/splitbutton";
import { Tooltip } from "primereact/tooltip";
import { exportSamplesTemplate } from "@/utils/exportSamplesTemplate";
import { useMapConfigContext } from "@/components/AppWrapper";

export default function DownloadSamplesTemplateButton({ samples }) {
  const { postcodePrefix = "" } = useMapConfigContext() ?? {};

  const items = [
    {
      label: "Missing location",
      icon: "pi pi-map-marker",
      command: () =>
        exportSamplesTemplate(samples, "missingLocation", postcodePrefix),
    },
    {
      label: "Incomplete samples",
      icon: "pi pi-exclamation-triangle",
      command: () =>
        exportSamplesTemplate(samples, "incomplete", postcodePrefix),
    },
    {
      label: "All samples",
      icon: "pi pi-list",
      command: () => exportSamplesTemplate(samples, "all", postcodePrefix),
    },
  ];

  return (
    <>
      <Tooltip
        target=".download-template-btn"
        content="Download bulk correction template"
        position="left"
      />

      <SplitButton
        icon="pi pi-download"
        model={items}
        onClick={() =>
          exportSamplesTemplate(samples, "incomplete", postcodePrefix)
        }
        className="p-button-outlined p-button-sm download-template-btn"
        aria-label="Download bulk correction template"
      />
    </>
  );
}
