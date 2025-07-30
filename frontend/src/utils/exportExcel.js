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
      const EXCEL_TYPE =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
      const EXCEL_EXTENSION = ".xlsx";

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
