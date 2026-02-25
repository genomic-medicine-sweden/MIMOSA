"use client";

import { SplitButton } from "primereact/splitbutton";
import { Tooltip } from "primereact/tooltip";
import { exportSamplesTemplate } from "@/utils/exportSamplesTemplate";

export default function DownloadSamplesTemplateButton({ samples }) {
  const items = [
    {
      label: "Missing location",
      icon: "pi pi-map-marker",
      command: () => exportSamplesTemplate(samples, "missingLocation"),
    },
    {
      label: "Incomplete samples",
      icon: "pi pi-exclamation-triangle",
      command: () => exportSamplesTemplate(samples, "incomplete"),
    },
    {
      label: "All samples",
      icon: "pi pi-list",
      command: () => exportSamplesTemplate(samples, "all"),
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
        onClick={() => exportSamplesTemplate(samples, "incomplete")}
        className="p-button-outlined p-button-sm download-template-btn"
        aria-label="Download bulk correction template"
      />
    </>
  );
}
