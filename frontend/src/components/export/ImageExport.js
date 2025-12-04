import React from "react";
import { Button } from "primereact/button";
import { Tooltip } from "primereact/tooltip";
import { exportElementAsPng } from "@/utils/exportImage";

const ImageExport = ({ mainContentRef }) => {
  const handleExportImage = () => {
    if (mainContentRef?.current) {
      exportElementAsPng(mainContentRef.current);
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
