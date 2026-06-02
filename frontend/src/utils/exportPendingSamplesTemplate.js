export async function downloadPendingSamplesTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pending Samples");

  sheet.columns = [
    { header: "SampleID", key: "expectedId", width: 25 },
    { header: "PostCode", key: "postCode", width: 15 },
    { header: "Hospital", key: "hospital", width: 30 },
    { header: "Latitude", key: "lat", width: 15 },
    { header: "Longitude", key: "lng", width: 15 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "MIMOSA_pending_samples_template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
