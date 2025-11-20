import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const flattenTyping = (typing) => {
  const flat = {};
  if (!typing) return flat;

  if (typing.ST) {
    flat["typing.ST"] = typing.ST;
  }

  if (typing.alleles && typeof typing.alleles === "object") {
    for (const [key, value] of Object.entries(typing.alleles)) {
      flat[`typing.alleles.${key}`] = value;
    }
  }

  return flat;
};

export const exportExcel = async (data) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("data");

  const allProperties = data.map(({ properties }) => {
    const { typing, ...rest } = properties;
    const flatTyping = flattenTyping(typing);
    return { ...rest, ...flatTyping };
  });

  if (allProperties.length === 0) return;

  const columns = Object.keys(allProperties[0]).map((key) => ({
    header: key,
    key,
  }));

  worksheet.columns = columns;
  worksheet.addRows(allProperties);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAsExcelFile(buffer);
};

const saveAsExcelFile = (buffer) => {
  const EXCEL_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
  const EXCEL_EXTENSION = ".xlsx";

  const date = new Date();
  const formattedDate = date.toISOString().split("T")[0].replace(/-/g, "");
  const fileName = `MIMOSA_${formattedDate}${EXCEL_EXTENSION}`;

  const blob = new Blob([buffer], { type: EXCEL_TYPE });
  saveAs(blob, fileName);
};
