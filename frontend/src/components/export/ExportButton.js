import React, { useRef } from "react";
import { Button } from "primereact/button";
import { Tooltip } from "primereact/tooltip";
import { exportExcel } from "@/utils/exportExcel";

const ExportButton = ({ data }) => {
  const buttonRef = useRef(null);

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        icon="pi pi-file-excel"
        rounded
        text
        raised
        onClick={() => exportExcel(data)}
        data-pr-tooltip="Export as Excel"
        tooltipOptions={{ position: "bottom" }}
      />
      <Tooltip target={buttonRef} content="Export as Excel" position="bottom" />
    </>
  );
};

export default ExportButton;
