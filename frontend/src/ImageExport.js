import React from "react";
import { Button } from "primereact/button";
import { Tooltip } from "primereact/tooltip";
import "primeicons/primeicons.css";
import domtoimage from "dom-to-image";

const ImageExport = ({ mainContentRef }) => {
  const handleExportImage = () => {
    if (mainContentRef.current) {
      domtoimage
        .toPng(mainContentRef.current, {
          quality: 1.0,
          bgcolor: null,
        })
        .then((dataUrl) => {
          const today = new Date();
          const formattedDate = today
            .toISOString()
            .split("T")[0]
            .replace(/-/g, "");
          const fileName = `MIMOSA_${formattedDate}.png`;

          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = fileName;
          link.click();
        })
        .catch((err) => {
          console.error("Error exporting image:", err);
        });
    }
  };

  return (
    <div>
      <Tooltip target=".export-button" content="Export as PNG" />
      <Button
        icon="pi pi-image"
        className="p-button-rounded export-button custom-export-button"
        aria-label="Export Image"
        onClick={handleExportImage}
        rounded
        text
        raised
      />
    </div>
  );
};

export default ImageExport;

