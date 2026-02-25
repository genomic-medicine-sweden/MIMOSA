import ExcelJS from "exceljs";

export async function exportSamplesTemplate(samples, mode = "all") {
  let filtered = samples;

  if (mode === "incomplete") {
    filtered = samples.filter((s) => s.isIncomplete);
  }

  if (mode === "missingLocation") {
    filtered = samples.filter((s) => s.missingLocation);
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("BulkCorrection");

  worksheet.columns = [
    { header: "SampleID", key: "SampleID", width: 20 },
    { header: "analysis_profile", key: "analysis_profile", width: 22 },
    { header: "Hospital", key: "Hospital", width: 20 },
    { header: "PostCode", key: "PostCode", width: 15 },
    { header: "Date", key: "Date", width: 15 },
  ];

  filtered.forEach((s) => {
    const rawProfile = s.properties.analysis_profile || "";

    worksheet.addRow({
      SampleID: s.properties.ID || "",
      analysis_profile: rawProfile.replace(/_/g, " "),
      Hospital: s.properties.Hospital || "",
      PostCode: s.properties.PostCode?.replace(/^SE-/, "") || "",
      Date: s.properties.Date || "",
    });
  });

  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const fileNameMap = {
    all: "MIMOSA_All_Samples_Template.xlsx",
    incomplete: "MIMOSA_Incomplete_Samples_Template.xlsx",
    missingLocation: "MIMOSA_Missing_Location_Samples_Template.xlsx",
  };

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileNameMap[mode];
  a.click();
  URL.revokeObjectURL(url);
}
