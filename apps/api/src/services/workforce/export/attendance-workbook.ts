import ExcelJS from "exceljs";
import type { WorkforceSnapshot, WorkforceRow } from "@mgl/types";
import {
  attendanceDates,
  attendanceDayValue,
  attendanceExportGroups,
  attendanceMetrics,
} from "./attendance-matrix";

const identityHeaders = [
  "№",
  "Нэр",
  "Овог",
  "Ажилтны код",
  "Түвшин",
  "Алба хэлтэс",
  "Албан тушаал",
  "Төлөв",
  "Регистр",
];
const weekdays = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];
const fill = (argb: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});
const border: Partial<ExcelJS.Borders> = Object.fromEntries(
  ["top", "left", "bottom", "right"].map((side) => [
    side,
    { style: "thin", color: { argb: "FF555555" } },
  ]),
);

export function createAttendanceWorkbook(
  data: Pick<WorkforceSnapshot, "range" | "policy" | "employees">,
  rows: readonly WorkforceRow[],
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MGL Business";
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet("Ерөнхий тайлан", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 3, topLeftCell: "D4" }],
  });
  const days = attendanceDates(data.range.from, data.range.to);
  const summaryStart = identityHeaders.length + days.length + 1;
  const lastColumn = summaryStart + attendanceExportGroups.length * 3 - 1;
  sheet.mergeCells(1, 1, 1, lastColumn);
  sheet.getCell(1, 1).value =
    `${data.range.from} - ${data.range.to}-н ерөнхий тайлан`;
  sheet.getCell(1, 1).font = { bold: true, size: 14 };
  sheet.getRow(1).height = 34;
  identityHeaders.forEach((label, index) => {
    sheet.mergeCells(2, index + 1, 3, index + 1);
    sheet.getCell(2, index + 1).value = label;
    sheet.getColumn(index + 1).width = index ? 18 : 5;
  });
  for (const col of [3, 4, 7, 9])
    sheet.getCell(2, col).note =
      "Энэ талбар цаг бүртгэлийн эх өгөгдөлд байхгүй бол хоосон гарна. Нэрийг овог, нэр болгон таамгаар хуваахгүй.";
  days.forEach((day, index) => {
    const col = index + 10;
    sheet.getCell(2, col).value = new Date(`${day}T00:00:00Z`);
    sheet.getCell(2, col).numFmt = "yyyy-mm-dd";
    sheet.getCell(3, col).value =
      weekdays[new Date(`${day}T00:00:00Z`).getUTCDay()];
    sheet.getColumn(col).width = 21;
  });
  attendanceExportGroups.forEach(([label, color, bodyColor], index) => {
    const col = summaryStart + index * 3;
    sheet.mergeCells(2, col, 2, col + 2);
    sheet.getCell(2, col).value = label;
    sheet.getCell(2, col).fill = fill(color);
    ["Өдөр", "Цаг", "Мин"].forEach((unit, offset) => {
      sheet.getCell(3, col + offset).value = unit;
      sheet.getCell(3, col + offset).fill = fill(bodyColor);
      sheet.getColumn(col + offset).width = 7;
    });
  });
  sheet.getCell(2, summaryStart + 12).note =
    "Өдрийн тал гэсэн тусдаа ангилал одоогоор байхгүй тул '-' гарна. Хоцролтыг өдрийн тал гэж таамгаар ангилахгүй.";
  sheet.getCell(2, summaryStart + 24).note =
    "Хуваарь эхлэхээс өмнө бүртгэгдсэн, хаагдсан ирцийн цаг. Нэмэлт цалингийн баталгаа биш.";
  sheet.getCell(2, summaryStart + 27).note =
    "Хуваарь дууссанаас хойш бүртгэгдсэн, хаагдсан ирцийн цаг. Нэмэлт цалингийн баталгаа биш.";
  sheet.getCell(2, summaryStart + 33).note =
    "Нийт ажилласан хугацаанд идэвхийн цаг багтсан тул дахин нэмэхгүй. Завсарлага хассан системийн тайлангийн минутыг ашиглана.";
  const groups = new Map<string, WorkforceRow[]>();
  for (const row of rows) {
    const group = groups.get(row.userId) ?? [];
    group.push(row);
    groups.set(row.userId, group);
  }
  const employees = new Map(
    data.employees.map((employee) => [employee.userId, employee]),
  );
  const ordered = [...groups.values()].sort((a, b) =>
    a[0].employeeName.localeCompare(b[0].employeeName, "mn"),
  );
  ordered.forEach((group, index) => {
    const rowNumber = index + 4;
    const employee = employees.get(group[0].userId);
    const role =
      employee?.role === "OWNER"
        ? "Эзэмшигч"
        : employee?.role === "ADMIN"
          ? "Админ"
          : "Ажилтан";
    const identity = [
      index + 1,
      group[0].employeeName,
      "",
      "",
      role,
      group[0].department,
      "",
      employee?.active === false ? "Идэвхгүй" : "Идэвхтэй",
      "",
    ];
    identity.forEach((value, col) => {
      sheet.getCell(rowNumber, col + 1).value = value === "" ? null : value;
    });
    const byDay = new Map(group.map((row) => [row.date, row]));
    days.forEach((day, col) => {
      const value = byDay.get(day);
      const cell = sheet.getCell(rowNumber, col + 10);
      cell.value = attendanceDayValue(value, data.policy.timeZone);
      if (value?.status === "ABSENT") cell.fill = fill("FFF8D4D4");
      else if (value?.lateMinutes) cell.fill = fill("FFFBF0CE");
      else if (
        value &&
        ["DAY_OFF", "UNSCHEDULED", "LEAVE"].includes(value.status)
      )
        cell.fill = fill("FFDDE2E3");
    });
    attendanceMetrics(group).forEach((metric, metricIndex) => {
      const values = [
        metric.days,
        metric.minutes === null ? null : Math.floor(metric.minutes / 60),
        metric.minutes === null ? null : metric.minutes % 60,
      ];
      values.forEach((value, offset) => {
        const cell = sheet.getCell(
          rowNumber,
          summaryStart + metricIndex * 3 + offset,
        );
        cell.value = value || "-";
        cell.fill = fill(attendanceExportGroups[metricIndex][2]);
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    });
  });
  const totalRow = ordered.length + 4;
  sheet.mergeCells(totalRow, 1, totalRow, 3);
  sheet.getCell(totalRow, 1).value = "Нийт";
  for (let col = summaryStart; col <= lastColumn; col++) {
    const cell = sheet.getCell(totalRow, col);
    const letter = sheet.getColumn(col).letter;
    let result = 0;
    for (let row = 4; row < totalRow; row++) {
      const value = sheet.getCell(row, col).value;
      if (typeof value === "number") result += value;
    }
    cell.value =
      Math.floor((col - summaryStart) / 3) === 4
        ? "-"
        : ordered.length
          ? { formula: `SUM(${letter}4:${letter}${totalRow - 1})`, result }
          : 0;
    cell.fill = fill(
      attendanceExportGroups[Math.floor((col - summaryStart) / 3)][2],
    );
  }
  for (let row = 1; row <= totalRow; row++) {
    sheet.getRow(row).height = row === 1 ? 34 : row <= 3 ? 24 : 22;
    for (let col = 1; col <= lastColumn; col++) {
      const cell = sheet.getCell(row, col);
      cell.border = border;
      if (row !== 1)
        cell.font = {
          name: "Calibri",
          size: 11,
          bold: row <= 3 || row === totalRow,
        };
      if (row <= 3)
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      else if (col < summaryStart)
        cell.alignment = { horizontal: "left", vertical: "middle" };
    }
  }
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 0,
    fitToHeight: 0,
    printTitlesRow: "1:3",
  };
  return workbook;
}
export async function exportAttendanceWorkbook(
  data: Pick<WorkforceSnapshot, "range" | "policy" | "employees">,
  rows: readonly WorkforceRow[],
): Promise<Buffer> {
  return Buffer.from(
    await createAttendanceWorkbook(data, rows).xlsx.writeBuffer(),
  );
}
