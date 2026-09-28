import { buildScheduleGrid, formatWeekRange, weekBounds, type School } from "@gita/domain";
import ExcelJS from "exceljs";

const thin = { style: "thin" as const, color: { argb: "FF1E2430" } };

function paint(cell: ExcelJS.Cell, header = false) {
  cell.border = { top: thin, left: thin, bottom: thin, right: thin };
  cell.alignment = { vertical: "middle", wrapText: true };
  if (header) {
    cell.font = { name: "Calibri", bold: true, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F0EA" } };
  } else {
    cell.font = { name: "Calibri", size: 11 };
  }
}

export async function buildWorkbook(
  school: School,
  weekIndexes: number[],
  orientation: "landscape" | "portrait",
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gita";
  workbook.title = school.name;
  const sheet = workbook.addWorksheet("Nöbet", {
    pageSetup: {
      paperSize: 9,
      orientation,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
    },
    views: [{ showGridLines: false }],
  });
  const columns = Math.max(2, school.places.length + 1);
  let row = 1;
  for (const [index, weekIndex] of weekIndexes.entries()) {
    const bounds = weekBounds(school, weekIndex);
    const grid = buildScheduleGrid(school, weekIndex, formatWeekRange(bounds.start, bounds.end));
    sheet.mergeCells(row, 1, row, columns);
    const title = sheet.getCell(row, 1);
    title.value = school.name;
    title.font = { name: "Calibri", size: 16, bold: true };
    row += 1;
    sheet.mergeCells(row, 1, row, columns);
    const meta = sheet.getCell(row, 1);
    meta.value = `${grid.title} · ${grid.rangeLabel}`;
    meta.font = { name: "Calibri", size: 12 };
    row += 2;
    const header = sheet.getRow(row);
    header.getCell(1).value = "Gün";
    paint(header.getCell(1), true);
    grid.placeNames.forEach((name, placeIndex) => {
      const cell = header.getCell(placeIndex + 2);
      cell.value = name;
      paint(cell, true);
    });
    row += 1;
    for (const line of grid.rows) {
      const record = sheet.getRow(row);
      record.getCell(1).value = line.dayLabel;
      paint(record.getCell(1), true);
      line.cells.forEach((value, placeIndex) => {
        const cell = record.getCell(placeIndex + 2);
        cell.value = value;
        paint(cell);
      });
      record.height = 22;
      row += 1;
    }
    if (index < weekIndexes.length - 1) row += 2;
  }
  sheet.getColumn(1).width = 16;
  for (let column = 2; column <= columns; column += 1) {
    sheet.getColumn(column).width = 20;
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
