import { addPlace, addTeacher, assignTeacher, createSchool, createTeacher } from "@gita/domain";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildWorkbook } from "./workbook";

function sampleSchool() {
  let school = createSchool("Test Okulu", new Date(2026, 8, 28));
  const teacher = createTeacher("Ali", "Kaya", "Beden");
  school = addTeacher(school, teacher);
  school = addPlace(school, "Bahçe");
  school = assignTeacher(school, "mon", school.places[0]!.id, teacher.id);
  return school;
}

describe("excel", () => {
  it("tek haftayı yatay, iki haftayı dikey sayfaya yazar", async () => {
    const school = sampleSchool();
    const landscape = await buildWorkbook(school, [0], "landscape");
    const portrait = await buildWorkbook(school, [0, 1], "portrait");
    const one = new ExcelJS.Workbook();
    await one.xlsx.load(Buffer.from(landscape) as never);
    expect(one.worksheets[0]?.pageSetup.orientation).toBe("landscape");
    expect(one.worksheets[0]?.getCell("A1").value).toBe("Test Okulu");
    expect(one.worksheets[0]?.getCell("A4").value).toBe("Gün");
    const two = new ExcelJS.Workbook();
    await two.xlsx.load(Buffer.from(portrait) as never);
    expect(two.worksheets[0]?.pageSetup.orientation).toBe("portrait");
    const values: string[] = [];
    two.worksheets[0]?.eachRow((row) => {
      const value = row.getCell(1).value;
      if (typeof value === "string") values.push(value);
    });
    expect(values.some((value) => value.includes("1. hafta"))).toBe(true);
    expect(values.some((value) => value.includes("2. hafta"))).toBe(true);
  });
});
