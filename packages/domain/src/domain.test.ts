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
  setTeacherPinned,
  setTermStart,
  shuffleDuties,
  snapToMonday,
  sourcePlaceIndex,
  sourceSlot,
  swapDisplayedCells,
  teacherDuty,
  teacherIdAt,
  updateTeacher,
  weekBounds,
  type School,
  type Weekday,
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

function posted() {
  const roster = schoolWithRoster();
  let school = roster.school;
  school = setTeacherDuty(school, roster.ayse.id, "mon", roster.bahce.id);
  school = setTeacherDuty(school, roster.kemal.id, "mon", roster.koridor.id);
  school = setTeacherDuty(school, roster.seda.id, "mon", roster.kantin.id);
  return { ...roster, school };
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

function located(school: School, week: number, teacherId: string): { day: Weekday; place: number }[] {
  const hits: { day: Weekday; place: number }[] = [];
  for (const day of school.days) {
    school.places.forEach((_, place) => {
      if (teacherIdAt(school, week, day, place) === teacherId) hits.push({ day, place });
    });
  }
  return hits;
}

describe("rotasyon", () => {
  it("hafta adımı günü yerinde bırakır, yeri kaydırır", () => {
    expect(sourceSlot(1, 0, 0, 5, 3)).toEqual({ dayIndex: 0, placeIndex: 2 });
    expect(sourceSlot(1, 2, 1, 5, 3)).toEqual({ dayIndex: 2, placeIndex: 0 });
    expect(sourcePlaceIndex(1, 0, 3, [0])).toBe(0);
    expect(sourcePlaceIndex(1, 1, 3, [0])).toBe(2);
    expect(sourcePlaceIndex(1, 2, 3, [0])).toBe(1);
  });

  it("0. hafta tabanı gösterir, sonraki hafta aynı günde bir sonraki yere kayar", () => {
    const { school, ayse, kemal, seda } = schoolWithRoster();
    expect(teacherIdAt(school, 0, "mon", 0)).toBe(ayse.id);
    expect(teacherIdAt(school, 0, "mon", 1)).toBe(kemal.id);
    expect(teacherIdAt(school, 0, "mon", 2)).toBe(seda.id);
    expect(teacherIdAt(school, 1, "mon", 0)).toBe(seda.id);
    expect(teacherIdAt(school, 1, "mon", 1)).toBe(ayse.id);
    expect(teacherIdAt(school, 1, "mon", 2)).toBe(kemal.id);
    expect(teacherIdAt(school, 1, "tue", 0)).toBeNull();
    expect(teacherIdAt(school, 3, "mon", 0)).toBe(ayse.id);
    for (const teacher of [ayse, kemal, seda]) {
      const first = located(school, 0, teacher.id);
      expect(first).toHaveLength(1);
      expect(located(school, 1, teacher.id)).toEqual([{ day: "mon", place: (first[0]!.place + 1) % 3 }]);
      expect(located(school, 4, teacher.id)[0]?.day).toBe("mon");
    }
  });

  it("görünen haftadaki takas aynı günün taban yerini değiştirir", () => {
    const { school, ayse, kemal, seda } = schoolWithRoster();
    const swapped = swapDisplayedCells(school, 1, "mon", 0, 1);
    expect(teacherIdAt(swapped, 1, "mon", 0)).toBe(ayse.id);
    expect(teacherIdAt(swapped, 1, "mon", 1)).toBe(seda.id);
    expect(teacherIdAt(swapped, 1, "mon", 2)).toBe(kemal.id);
    expect(teacherIdAt(swapped, 0, "mon", 0)).toBe(seda.id);
    expect(teacherIdAt(swapped, 0, "mon", 2)).toBe(ayse.id);
    expect(teacherIdAt(swapped, 1, "tue", 0)).toBeNull();
  });

  it("yer sırası değişince 0. haftada öğretmen yerinde kalır, yer turu yeni halkayı kullanır", () => {
    const { school, ayse, kemal, seda, bahce, koridor, kantin } = schoolWithRoster();
    const reordered = reorderPlaces(school, [koridor.id, bahce.id, kantin.id]);
    expect(teacherIdAt(reordered, 0, "mon", 0)).toBe(kemal.id);
    expect(teacherIdAt(reordered, 0, "mon", 1)).toBe(ayse.id);
    expect(teacherIdAt(reordered, 1, "mon", 0)).toBe(seda.id);
    expect(teacherIdAt(reordered, 1, "mon", 1)).toBe(kemal.id);
  });
});

describe("ilk nöbet", () => {
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

  it("gün ve yer değişince 0. hafta yeni hücredir, sonraki hafta aynı günde yer kayar", () => {
    const { school, ayse } = posted();
    const moved = setTeacherDuty(school, ayse.id, "wed", school.places[1]!.id);
    expect(teacherDuty(moved, ayse.id)).toEqual({ day: "wed", placeId: school.places[1]!.id });
    expect(teacherIdAt(moved, 0, "wed", 1)).toBe(ayse.id);
    expect(teacherIdAt(moved, 1, "wed", 1)).not.toBe(ayse.id);
    expect(teacherIdAt(moved, 1, "wed", 2)).toBe(ayse.id);
    expect(teacherIdAt(moved, 1, "mon", 1)).not.toBe(ayse.id);
  });

  it("tablodaki takas ilk nöbeti bozmaz, sıfırla onu geri yazar", () => {
    const { school, ayse, seda } = posted();
    const swapped = swapDisplayedCells(school, 1, "mon", 0, 1);
    expect(swapped.baseline).toEqual(school.baseline);
    expect(teacherIdAt(swapped, 1, "mon", 0)).toBe(ayse.id);
    expect(teacherIdAt(swapped, 1, "mon", 1)).toBe(seda.id);
    const restored = resetToBaseline(swapped);
    expect(teacherIdAt(restored, 0, "mon", 0)).toBe(ayse.id);
    expect(teacherIdAt(restored, 1, "mon", 0)).toBe(seda.id);
    expect(resetToBaseline(restored)).toBe(restored);
  });
});

describe("çakılı nöbet", () => {
  it("çakılı öğretmen her hafta aynı gün ve yerde kalır, diğerleri aynı günde boş yerlerde döner", () => {
    const { school, ayse, kemal, seda } = posted();
    const pinned = setTeacherPinned(school, ayse.id, true);
    expect(setTeacherPinned(pinned, ayse.id, true)).toBe(pinned);
    for (const week of [0, 1, 2, 5]) {
      expect(located(pinned, week, ayse.id)).toEqual([{ day: "mon", place: 0 }]);
      expect(located(pinned, week, kemal.id)).toHaveLength(1);
      expect(located(pinned, week, seda.id)).toHaveLength(1);
      expect(located(pinned, week, kemal.id)[0]?.day).toBe("mon");
      expect(located(pinned, week, seda.id)[0]?.day).toBe("mon");
      expect(teacherIdAt(pinned, week, "tue", 0)).toBeNull();
    }
    expect(teacherIdAt(pinned, 1, "mon", 0)).toBe(ayse.id);
    expect(teacherIdAt(pinned, 1, "mon", 1)).toBe(seda.id);
    expect(teacherIdAt(pinned, 1, "mon", 2)).toBe(kemal.id);
    expect(swapDisplayedCells(pinned, 1, "mon", 0, 1)).toBe(pinned);
    const moved = swapDisplayedCells(pinned, 1, "mon", 1, 2);
    expect(teacherIdAt(moved, 1, "mon", 0)).toBe(ayse.id);
    expect(teacherIdAt(moved, 1, "mon", 1)).toBe(kemal.id);
    expect(teacherIdAt(moved, 1, "mon", 2)).toBe(seda.id);
    expect(located(moved, 3, ayse.id)).toEqual([{ day: "mon", place: 0 }]);
    const loose = setTeacherPinned(pinned, ayse.id, false);
    expect(teacherIdAt(loose, 1, "mon", 0)).toBe(seda.id);
  });

  it("nöbeti olmayan öğretmen çakılmaz", () => {
    const teacher = createTeacher("Ali", "Kaya", "Beden");
    const school = addTeacher(createSchool("Okul"), teacher);
    expect(setTeacherPinned(school, teacher.id, true)).toBe(school);
  });

  it("ad düzenlemesi çakıyı silmez", () => {
    const { school, ayse } = posted();
    const pinned = setTeacherPinned(school, ayse.id, true);
    const saved = updateTeacher(pinned, { ...ayse, pinned: true, firstName: "Ayşen" });
    expect(saved.teachers.find((teacher) => teacher.id === ayse.id)).toMatchObject({
      firstName: "Ayşen",
      pinned: true,
    });
    expect(located(saved, 2, ayse.id)).toEqual([{ day: "mon", place: 0 }]);
  });
});

describe("karıştır", () => {
  it("çakılı öğretmeni yerinde bırakır, diğerlerinin gün ve yerini dağıtır", () => {
    const { school, ayse, kemal, seda, bahce, kantin } = posted();
    const pinned = setTeacherPinned(school, ayse.id, true);
    const shuffled = shuffleDuties(pinned, () => 0);
    expect(teacherDuty(shuffled, ayse.id)).toEqual({ day: "mon", placeId: bahce.id });
    expect(shuffled.assignment.mon?.[bahce.id]).toBe(ayse.id);
    expect(teacherDuty(shuffled, kemal.id)).toEqual({ day: "mon", placeId: kantin.id });
    expect(teacherDuty(shuffled, seda.id)).toEqual({ day: "tue", placeId: bahce.id });
    expect(shuffled.teachers.find((teacher) => teacher.id === ayse.id)?.pinned).toBe(true);
    expect(located(shuffled, 0, ayse.id)).toEqual([{ day: "mon", place: 0 }]);
    expect(located(shuffled, 1, ayse.id)).toEqual([{ day: "mon", place: 0 }]);
    expect(located(shuffled, 1, kemal.id)).toEqual([{ day: "mon", place: 1 }]);
    expect(located(shuffled, 1, seda.id)).toEqual([{ day: "tue", place: 1 }]);
    const seen = new Set<string>();
    for (const day of shuffled.days) {
      for (const place of shuffled.places) {
        const teacherId = shuffled.baseline[day]?.[place.id];
        if (!teacherId) continue;
        expect(seen.has(teacherId)).toBe(false);
        seen.add(teacherId);
      }
    }
    expect(seen).toEqual(new Set([ayse.id, kemal.id, seda.id]));
  });

  it("herkes çakılıysa karıştırma okulu olduğu gibi bırakır", () => {
    let { school, ayse, kemal, seda } = posted();
    school = setTeacherPinned(school, ayse.id, true);
    school = setTeacherPinned(school, kemal.id, true);
    school = setTeacherPinned(school, seda.id, true);
    expect(shuffleDuties(school, () => 0)).toBe(school);
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

  it("çakı bayrağı okunur, yoksa kapalı sayılır", () => {
    const { school, ayse } = schoolWithRoster();
    const store = addSchool(emptyStore(), school);
    const raw = structuredClone(store) as {
      schools: { teachers: { id: string; pinned?: boolean }[] }[];
    };
    const teacher = raw.schools[0]?.teachers.find((item) => item.id === ayse.id);
    if (!teacher) throw new Error("öğretmen yok");
    teacher.pinned = true;
    expect(parseStore(raw).schools[0]?.teachers.find((item) => item.id === ayse.id)?.pinned).toBe(true);
    delete teacher.pinned;
    expect(parseStore(raw).schools[0]?.teachers.find((item) => item.id === ayse.id)?.pinned).toBe(false);
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
