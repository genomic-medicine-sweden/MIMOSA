"use client";

import { useCallback, useState } from "react";
import ExcelJS from "exceljs";

export default function ExcelDropzone({ onParsed }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      setDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      if (!file.name.endsWith(".xlsx")) {
        alert("Only .xlsx files are supported");
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        alert("Excel file contains no sheets");
        return;
      }

      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values.slice(1).map((h) => String(h).trim());

      const rows = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const obj = {};
        row.values.slice(1).forEach((cell, idx) => {
          const key = headers[idx];
          if (!key) return;
          if (cell === null || cell === undefined || cell === "") return;
          if (cell instanceof Date) {
            const yyyy = cell.getFullYear();
            const mm = String(cell.getMonth() + 1).padStart(2, "0");
            const dd = String(cell.getDate()).padStart(2, "0");
            obj[key] = `${yyyy}-${mm}-${dd}`;
          } else {
            obj[key] = String(cell).trim();
          }
        });

        if (Object.keys(obj).length > 0) {
          rows.push({ __row: rowNumber, ...obj });
        }
      });

      onParsed(rows);
    },
    [onParsed],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`w-full mb-3 p-4 border-2 border-dashed rounded ${
        dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
      style={{ textAlign: "center", cursor: "pointer" }}
    >
      <strong>Drag & drop Excel file here</strong>
      <div className="text-sm text-gray-600">
        Expected columns: SampleID, Hospital, PostCode, Date
      </div>
    </div>
  );
}
