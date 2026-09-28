import { describe, expect, it } from "vitest";
import {
  addPlace,
  addSchool,
  addTeacher,
  assignTeacher,
  buildScheduleGrid,
  createSchool,
  createTeacher,
  duplicateTeacherIds,
  emptyStore,
  firstOpenDuty,
  movePlace,
  parseStore,
  reorderPlaces,
  resetToBaseline,
  setTeacherDuty,
  setTermStart,
  snapToMonday,
  swapDisplayedCells,
  teacherDuty,
  teacherIdAt,
  weekBounds,
} from "./index";

function schoolWithRoster() {
  let school = createSchool("Atatürk İlkokulu", new Date(2026, 8, 30));
  const ayse = createTeacher("Ayşe", "Demir", "Sınıf");
  const kemal = createTeacher("Kemal", "Yıldız", "Matematik");
  const seda = createTeacher("Seda", "Akın", "Türkçe");
  school = addTeacher(school, ayse);
  school = addTeacher(school, kemal);
  school = addTeacher(school, seda);
  school = addPlace(school, "Bahçe");
  school = addPlace(school, "Koridor");
  school = addPlace(school, "Kantin");
  const [bahce, koridor, kantin] = school.places;
  school = assignTeacher(school, "mon", bahce.id, ayse.id);
  school = assignTeacher(school, "mon", koridor.id, kemal.id);
  school = assignTeacher(school, "mon", kantin.id, seda.id);
  return { school, ayse, kemal, seda, bahce, koridor, kantin };
}

describe("snapToMonday", () => {
  it("çarşambayı aynı haftanın pazartesine alır", () => {
    expect(snapToMonday("2026-09-30")).toBe("2026-09-28");
  });

  it("pazarı bir önceki pazartesiye alır", () => {
    expect(snapToMonday("2026-09-27")).toBe("2026-09-21");
  });

  it("pazartesiyi olduğu gibi bırakır", () => {
    expect(snapToMonday("2026-09-28")).toBe("2026-09-28");
  });
});

describe("rotasyon", () => {
  it("0. hafta tabanı gösterir, sonraki hafta aynı yerde bir sonraki güne kayar", () => {
    const { school, ayse, kemal, seda } = schoolWithRoster();
    expect(teacherIdAt(school, 0, "mon", 0)).toBe(ayse.id);
    expect(teacherIdAt(school, 0, "mon", 1)).toBe(kemal.id);
    expect(teacherIdAt(school, 0, "mon", 2)).toBe(seda.id);
    expect(teacherIdAt(school, 1, "tue", 0)).toBe(ayse.id);
    expect(teacherIdAt(school, 1, "tue", 1)).toBe(kemal.id);
    expect(teacherIdAt(school, 1, "tue", 2)).toBe(seda.id);
    expect(teacherIdAt(school, 1, "mon", 0)).toBeNull();
  });

  it("günler bir tam tur yapınca aynı güne döner ve bir sonraki yere kayar", () => {
    const { school, ayse, kemal, seda } = schoolWithRoster();
    expect(teacherIdAt(school, 5, "mon", 0)).toBe(seda.id);
    expect(teacherIdAt(school, 5, "mon", 1)).toBe(ayse.id);
    expect(teacherIdAt(school, 5, "mon", 2)).toBe(kemal.id);
    expect(teacherIdAt(school, 6, "tue", 0)).toBe(seda.id);
  });

  it("görünen haftadaki takas, o günün geldiği taban gününü değiştirir", () => {
    const { school, ayse, kemal, seda } = schoolWithRoster();
    const swapped = swapDisplayedCells(school, 1, "tue", 0, 1);
    expect(teacherIdAt(swapped, 1, "tue", 0)).toBe(kemal.id);
    expect(teacherIdAt(swapped, 1, "tue", 1)).toBe(ayse.id);
    expect(teacherIdAt(swapped, 1, "tue", 2)).toBe(seda.id);
    expect(teacherIdAt(swapped, 0, "mon", 0)).toBe(kemal.id);
    expect(teacherIdAt(swapped, 0, "mon", 1)).toBe(ayse.id);
    expect(teacherIdAt(swapped, 6, "tue", 0)).toBe(seda.id);
    expect(teacherIdAt(swapped, 6, "tue", 1)).toBe(kemal.id);
  });

  it("yer sırası değişince 0. haftada öğretmen yerinde kalır, yer turu yeni halkayı kullanır", () => {
    const { school, ayse, kemal, seda, bahce, koridor, kantin } = schoolWithRoster();
    const reordered = reorderPlaces(school, [koridor.id, bahce.id, kantin.id]);
    expect(teacherIdAt(reordered, 0, "mon", 0)).toBe(kemal.id);
    expect(teacherIdAt(reordered, 0, "mon", 1)).toBe(ayse.id);
    expect(teacherIdAt(reordered, 5, "mon", 0)).toBe(seda.id);
    expect(teacherIdAt(reordered, 5, "mon", 1)).toBe(kemal.id);
  });
});

describe("ilk nöbet", () => {
  function posted() {
    const roster = schoolWithRoster();
    let school = roster.school;
    school = setTeacherDuty(school, roster.ayse.id, "mon", roster.bahce.id);
    school = setTeacherDuty(school, roster.kemal.id, "mon", roster.koridor.id);
    school = setTeacherDuty(school, roster.seda.id, "mon", roster.kantin.id);
    return { ...roster, school };
  }

  it("ilk boş nöbet sıradaki gün ve yerdir", () => {
    const { school, bahce } = posted();
    expect(firstOpenDuty(school)).toEqual({ day: "tue", placeId: bahce.id });
  });

  it("dolu hücreye alınca iki öğretmen yer değiştirir", () => {
    const { school, ayse, kemal, bahce, koridor } = posted();
    const moved = setTeacherDuty(school, ayse.id, "mon", koridor.id);
    expect(teacherDuty(moved, ayse.id)).toEqual({ day: "mon", placeId: koridor.id });
    expect(teacherDuty(moved, kemal.id)).toEqual({ day: "mon", placeId: bahce.id });
    expect(moved.assignment.mon?.[koridor.id]).toBe(ayse.id);
    expect(moved.assignment.mon?.[bahce.id]).toBe(kemal.id);
  });

  it("gün ve yer değişince 0. hafta yeni hücredir, geç hafta onun kaymış halidir", () => {
    const { school, ayse, koridor } = posted();
    const moved = setTeacherDuty(school, ayse.id, "wed", koridor.id);
    expect(teacherDuty(moved, ayse.id)).toEqual({ day: "wed", placeId: koridor.id });
    expect(teacherIdAt(moved, 0, "wed", 1)).toBe(ayse.id);
    expect(teacherIdAt(moved, 3, "wed", 1)).not.toBe(ayse.id);
    expect(teacherIdAt(moved, 3, "mon", 1)).toBe(ayse.id);
  });

  it("tablodaki takas ilk nöbeti bozmaz, sıfırla onu geri yazar", () => {
    const { school, ayse, kemal } = posted();
    const swapped = swapDisplayedCells(school, 4, "fri", 0, 1);
    expect(swapped.baseline).toEqual(school.baseline);
    expect(teacherIdAt(swapped, 4, "fri", 0)).toBe(kemal.id);
    const restored = resetToBaseline(swapped);
    expect(teacherIdAt(restored, 0, "mon", 0)).toBe(ayse.id);
    expect(teacherIdAt(restored, 4, "fri", 0)).toBe(ayse.id);
    expect(resetToBaseline(restored)).toBe(restored);
  });
});

describe("atama", () => {
  it("aynı gün ikinci yere alınan öğretmeni eski yerden kaldırır", () => {
    const { school, ayse, bahce, koridor } = schoolWithRoster();
    const moved = assignTeacher(school, "mon", koridor.id, ayse.id);
    expect(duplicateTeacherIds(moved, "mon")).toEqual([]);
    expect(moved.assignment.mon?.[bahce.id]).toBeNull();
    expect(moved.assignment.mon?.[koridor.id]).toBe(ayse.id);
  });

  it("yukarı taşıma yer sırasını değiştirir", () => {
    const { school, koridor } = schoolWithRoster();
    const moved = movePlace(school, 1, -1);
    expect(moved.places[0]?.id).toBe(koridor.id);
  });
});

describe("takvim ve kayıt", () => {
  it("hafta aralığı pazartesiden cumaya gider", () => {
    const school = setTermStart(createSchool("Okul", new Date(2026, 8, 30)), "2026-09-30");
    expect(school.termStart).toBe("2026-09-28");
    const bounds = weekBounds(school, 1);
    expect(bounds.start.getDate()).toBe(5);
    expect(bounds.start.getMonth()).toBe(9);
    expect(bounds.end.getDate()).toBe(9);
  });

  it("kayıt okunur ve bozuk öğretmen kimliğini boşaltır", () => {
    const { school } = schoolWithRoster();
    const store = addSchool(emptyStore(), school);
    const raw = structuredClone(store) as unknown as {
      schools: { assignment: { mon: Record<string, string | null> } }[];
    };
    const placeId = school.places[0].id;
    raw.schools[0].assignment.mon[placeId] = "yok";
    const parsed = parseStore(raw);
    expect(parsed.schools[0]?.assignment.mon?.[placeId]).toBeNull();
    expect(parsed.activeSchoolId).toBe(school.id);
  });

  it("taban kaydı yoksa ilk nöbet mevcut atamadan kurulur", () => {
    const { school, ayse, bahce } = schoolWithRoster();
    const store = addSchool(emptyStore(), school);
    const raw = structuredClone(store) as { schools: { baseline?: unknown }[] };
    delete raw.schools[0]?.baseline;
    const parsed = parseStore(raw);
    expect(parsed.schools[0]?.baseline.mon?.[bahce.id]).toBe(ayse.id);
  });

  it("çizelge ızgarası öğretmen adını yazar", () => {
    const { school } = schoolWithRoster();
    const grid = buildScheduleGrid(school, 0, "28 Eylül – 2 Ekim 2026");
    expect(grid.rows[0]?.cells[0]).toBe("Ayşe Demir");
    expect(grid.placeNames).toEqual(["Bahçe", "Koridor", "Kantin"]);
  });
});
