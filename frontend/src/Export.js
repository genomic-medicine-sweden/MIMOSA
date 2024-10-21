import React, { useRef } from "react";
import { Button } from "primereact/button";
import { Tooltip } from "primereact/tooltip";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

export const exportExcel = (data) => {
  import("xlsx").then((xlsx) => {
    const worksheet = xlsx.utils.json_to_sheet(
      data.map((rowData) => rowData.properties)
    );
    const workbook = { Sheets: { data: worksheet }, SheetNames: ["data"] };
    const excelBuffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAsExcelFile(excelBuffer);
  });
};

const saveAsExcelFile = (buffer) => {
  import("file-saver").then((module) => {
    if (module && module.default) {
      let EXCEL_TYPE =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
      let EXCEL_EXTENSION = ".xlsx";

      const date = new Date();
      const formattedDate = date.toISOString().split("T")[0].replace(/-/g, "");

      const data = new Blob([buffer], {
        type: EXCEL_TYPE,
      });

      const fileName = `MIMOSA_${formattedDate}${EXCEL_EXTENSION}`;
      module.default.saveAs(data, fileName);
    }
  });
};

export const ExportButton = ({ data }) => {
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

