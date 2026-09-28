import { snapToMonday, todayISO } from "./dates";
import { sourcePlaceIndex } from "./rotation";
import {
  DAY_LABELS,
  DEFAULT_DAYS,
  WEEKDAYS,
  type DayAssignment,
  type Place,
  type School,
  type Teacher,
  type Weekday,
} from "./types";

export function createId(): string {
  return crypto.randomUUID();
}

export function teacherName(teacher: Teacher): string {
  return `${teacher.firstName} ${teacher.lastName}`.trim();
}

type Assignment = School["assignment"];

export function emptyAssignment(days: Weekday[], places: Place[]): Assignment {
  const assignment: Assignment = {};
  for (const day of days) {
    const row: DayAssignment = {};
    for (const place of places) row[place.id] = null;
    assignment[day] = row;
  }
  return assignment;
}

export function projectAssignment(source: Assignment, days: Weekday[], places: Place[]): Assignment {
  const assignment: Assignment = {};
  for (const day of days) {
    const previous = source[day] ?? {};
    const row: DayAssignment = {};
    for (const place of places) row[place.id] = previous[place.id] ?? null;
    assignment[day] = row;
  }
  return assignment;
}

function sameAssignment(left: Assignment, right: Assignment, days: Weekday[], places: Place[]): boolean {
  for (const day of days) {
    for (const place of places) {
      if ((left[day]?.[place.id] ?? null) !== (right[day]?.[place.id] ?? null)) return false;
    }
  }
  return true;
}

function withoutTeacher(source: Assignment, days: Weekday[], teacherId: string): Assignment {
  const assignment: Assignment = {};
  for (const day of days) {
    const row = { ...(source[day] ?? {}) };
    for (const placeId of Object.keys(row)) {
      if (row[placeId] === teacherId) row[placeId] = null;
    }
    assignment[day] = row;
  }
  return assignment;
}

/** Öğretmeni tek hücreye alır. Hedef doluysa eski hücreyle yer değiştirir. */
export function placeTeacher(
  source: Assignment,
  days: Weekday[],
  teacherId: string,
  day: Weekday,
  placeId: string,
): Assignment {
  let previous: { day: Weekday; placeId: string } | null = null;
  let occurrences = 0;
  for (const item of days) {
    const row = source[item] ?? {};
    for (const id of Object.keys(row)) {
      if (row[id] !== teacherId) continue;
      occurrences += 1;
      if (!previous) previous = { day: item, placeId: id };
    }
  }
  if (occurrences === 1 && previous?.day === day && previous.placeId === placeId) return source;

  const next: Assignment = {};
  for (const item of days) next[item] = { ...(source[item] ?? {}) };
  for (const item of days) {
    const row = next[item];
    if (!row) continue;
    for (const id of Object.keys(row)) {
      if (row[id] === teacherId) row[id] = null;
    }
  }
  const occupant = source[day]?.[placeId] ?? null;
  if (occupant && occupant !== teacherId && previous) {
    const prevRow = next[previous.day] ?? {};
    prevRow[previous.placeId] = occupant;
    next[previous.day] = prevRow;
  }
  const target = next[day] ?? {};
  target[placeId] = teacherId;
  next[day] = target;
  return next;
}

export function findTeacher(
  source: Assignment,
  days: Weekday[],
  places: Place[],
  teacherId: string,
): { day: Weekday; placeId: string } | null {
  for (const day of days) {
    for (const place of places) {
      if (source[day]?.[place.id] === teacherId) return { day, placeId: place.id };
    }
  }
  return null;
}

export function createSchool(name: string, now = new Date()): School {
  const days = [...DEFAULT_DAYS];
  return {
    id: createId(),
    name: name.trim(),
    termStart: snapToMonday(todayISO(now)),
    weekCount: 18,
    days,
    teachers: [],
    places: [],
    baseline: emptyAssignment(days, []),
    assignment: emptyAssignment(days, []),
  };
}

export function createTeacher(firstName: string, lastName: string, branch: string): Teacher {
  return {
    id: createId(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    branch: branch.trim(),
    pinned: false,
  };
}

export function addTeacher(school: School, teacher: Teacher): School {
  if (!teacher.firstName || !teacher.lastName) return school;
  return { ...school, teachers: [...school.teachers, teacher] };
}

export function updateTeacher(school: School, teacher: Teacher): School {
  return {
    ...school,
    teachers: school.teachers.map((item) =>
      item.id === teacher.id ? { ...item, ...teacher, pinned: teacher.pinned ?? item.pinned } : item,
    ),
  };
}

export function removeTeacher(school: School, teacherId: string): School {
  return {
    ...school,
    teachers: school.teachers.filter((teacher) => teacher.id !== teacherId),
    baseline: withoutTeacher(school.baseline, school.days, teacherId),
    assignment: withoutTeacher(school.assignment, school.days, teacherId),
  };
}

export function addPlace(school: School, name: string): School {
  const trimmed = name.trim();
  if (!trimmed) return school;
  const place: Place = { id: createId(), name: trimmed };
  const places = [...school.places, place];
  return {
    ...school,
    places,
    baseline: projectAssignment(school.baseline, school.days, places),
    assignment: projectAssignment(school.assignment, school.days, places),
  };
}

export function renamePlace(school: School, placeId: string, name: string): School {
  const trimmed = name.trim();
  if (!trimmed) return school;
  return {
    ...school,
    places: school.places.map((place) => (place.id === placeId ? { ...place, name: trimmed } : place)),
  };
}

export function removePlace(school: School, placeId: string): School {
  const places = school.places.filter((place) => place.id !== placeId);
  return {
    ...school,
    places,
    baseline: projectAssignment(school.baseline, school.days, places),
    assignment: projectAssignment(school.assignment, school.days, places),
  };
}

export function reorderPlaces(school: School, orderedIds: string[]): School {
  if (orderedIds.length !== school.places.length) return school;
  const byId = new Map(school.places.map((place) => [place.id, place]));
  const places: Place[] = [];
  for (const id of orderedIds) {
    const place = byId.get(id);
    if (!place) return school;
    places.push(place);
  }
  return { ...school, places };
}

export function movePlace(school: School, index: number, direction: -1 | 1): School {
  const next = index + direction;
  if (next < 0 || next >= school.places.length) return school;
  const ids = school.places.map((place) => place.id);
  const current = ids[index];
  if (!current) return school;
  ids.splice(index, 1);
  ids.splice(next, 0, current);
  return reorderPlaces(school, ids);
}

export function setSchoolDays(school: School, days: Weekday[]): School {
  const ordered = WEEKDAYS.filter((day) => days.includes(day));
  if (ordered.length === 0) return school;
  return {
    ...school,
    days: ordered,
    baseline: projectAssignment(school.baseline, ordered, school.places),
    assignment: projectAssignment(school.assignment, ordered, school.places),
  };
}

export function setTermStart(school: School, iso: string): School {
  return { ...school, termStart: snapToMonday(iso) };
}

export function setWeekCount(school: School, count: number): School {
  if (!Number.isFinite(count)) return school;
  const weekCount = Math.min(52, Math.max(1, Math.round(count)));
  return { ...school, weekCount };
}

export function renameSchool(school: School, name: string): School {
  const trimmed = name.trim();
  if (!trimmed) return school;
  return { ...school, name: trimmed };
}

export function teacherDuty(
  school: School,
  teacherId: string,
): { day: Weekday; placeId: string } | null {
  return findTeacher(school.baseline, school.days, school.places, teacherId);
}

export function firstOpenDuty(school: School): { day: Weekday; placeId: string } | null {
  let fallback: { day: Weekday; placeId: string } | null = null;
  for (const day of school.days) {
    for (const place of school.places) {
      const inBaseline = school.baseline[day]?.[place.id];
      const inAssignment = school.assignment[day]?.[place.id];
      if (!inBaseline && !inAssignment) return { day, placeId: place.id };
      if (!inBaseline && !fallback) fallback = { day, placeId: place.id };
    }
  }
  return fallback;
}

function teacherAnchor(
  school: School,
  teacherId: string,
): { day: Weekday; placeId: string } | null {
  return (
    findTeacher(school.baseline, school.days, school.places, teacherId) ??
    findTeacher(school.assignment, school.days, school.places, teacherId)
  );
}

/** Çakılı öğretmenin günü ve yeri haftalık kaydırmanın ve karıştırmanın dışında kalır. */
export function setTeacherPinned(school: School, teacherId: string, pinned: boolean): School {
  const current = school.teachers.find((teacher) => teacher.id === teacherId);
  if (!current || current.pinned === pinned) return school;
  const anchor = teacherAnchor(school, teacherId);
  if (pinned && !anchor) return school;
  const teachers = school.teachers.map((teacher) =>
    teacher.id === teacherId ? { ...teacher, pinned } : teacher,
  );
  if (!pinned || !anchor) return { ...school, teachers };
  const baseline = placeTeacher(school.baseline, school.days, teacherId, anchor.day, anchor.placeId);
  const assignment = placeTeacher(school.assignment, school.days, teacherId, anchor.day, anchor.placeId);
  if (baseline === school.baseline && assignment === school.assignment) return { ...school, teachers };
  return { ...school, teachers, baseline, assignment };
}

function shuffleCopy<T>(items: T[], random: () => number): T[] {
  const next = items.slice();
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = next[index];
    const other = next[swap];
    if (current === undefined || other === undefined) continue;
    next[index] = other;
    next[swap] = current;
  }
  return next;
}

/** Çakılı öğretmen durur. Diğerlerinin ilk nöbeti açık gün ve yerlere yeniden dağıtılır. */
export function shuffleDuties(school: School, random: () => number = Math.random): School {
  if (school.days.length === 0 || school.places.length === 0) return school;
  const pinned = new Set(school.teachers.filter((teacher) => teacher.pinned).map((teacher) => teacher.id));
  const grid = emptyAssignment(school.days, school.places);
  const taken = new Set<string>();
  for (const teacher of school.teachers) {
    if (!pinned.has(teacher.id)) continue;
    const anchor = teacherAnchor(school, teacher.id);
    if (!anchor) continue;
    const row = grid[anchor.day] ?? {};
    row[anchor.placeId] = teacher.id;
    grid[anchor.day] = row;
    taken.add(`${anchor.day}:${anchor.placeId}`);
  }
  const open: { day: Weekday; placeId: string }[] = [];
  for (const day of school.days) {
    for (const place of school.places) {
      if (!taken.has(`${day}:${place.id}`)) open.push({ day, placeId: place.id });
    }
  }
  const slots = shuffleCopy(open, random);
  const moving = school.teachers.filter((teacher) => !teacher.pinned);
  for (let index = 0; index < moving.length && index < slots.length; index += 1) {
    const teacher = moving[index];
    const slot = slots[index];
    if (!teacher || !slot) continue;
    const row = grid[slot.day] ?? {};
    row[slot.placeId] = teacher.id;
    grid[slot.day] = row;
  }
  if (
    sameAssignment(school.baseline, grid, school.days, school.places) &&
    sameAssignment(school.assignment, grid, school.days, school.places)
  ) {
    return school;
  }
  return {
    ...school,
    baseline: grid,
    assignment: projectAssignment(grid, school.days, school.places),
  };
}

/** İlk nöbeti gün ve yere yazar. Başlangıç haftası değişmez; aynı hücre her iki ızgaraya da işlenir. */
export function setTeacherDuty(
  school: School,
  teacherId: string,
  day: Weekday,
  placeId: string,
): School {
  if (!school.days.includes(day)) return school;
  if (!school.places.some((place) => place.id === placeId)) return school;
  if (!school.teachers.some((teacher) => teacher.id === teacherId)) return school;
  const baseline = placeTeacher(school.baseline, school.days, teacherId, day, placeId);
  const assignment = placeTeacher(school.assignment, school.days, teacherId, day, placeId);
  if (baseline === school.baseline && assignment === school.assignment) return school;
  return { ...school, baseline, assignment };
}

/** Tabloyu öğretmenlerdeki ilk nöbete döndürür. Hafta konumu ekranda ayrıca sıfırlanır. */
export function resetToBaseline(school: School): School {
  const assignment = projectAssignment(school.baseline, school.days, school.places);
  if (sameAssignment(school.assignment, assignment, school.days, school.places)) return school;
  return { ...school, assignment };
}

/** Aynı gündeki eski hücreyi boşaltır; bir öğretmen o gün tek yerde kalır. */
export function assignTeacher(
  school: School,
  day: Weekday,
  placeId: string,
  teacherId: string | null,
): School {
  if (!school.days.includes(day)) return school;
  if (!school.places.some((place) => place.id === placeId)) return school;
  if (teacherId && !school.teachers.some((teacher) => teacher.id === teacherId)) return school;
  const row: DayAssignment = { ...(school.assignment[day] ?? {}) };
  if (teacherId) {
    for (const id of Object.keys(row)) {
      if (row[id] === teacherId) row[id] = null;
    }
  }
  row[placeId] = teacherId;
  return { ...school, assignment: { ...school.assignment, [day]: row } };
}

function fixedPlaceIndexes(school: School, day: Weekday): number[] {
  const pinned = new Set(school.teachers.filter((teacher) => teacher.pinned).map((teacher) => teacher.id));
  const indexes: number[] = [];
  school.places.forEach((place, index) => {
    const teacherId = school.assignment[day]?.[place.id];
    if (teacherId && pinned.has(teacherId)) indexes.push(index);
  });
  return indexes;
}

function displayedSource(
  school: School,
  weekIndex: number,
  day: Weekday,
  placeIndex: number,
): { day: Weekday; placeId: string } | null {
  if (!school.days.includes(day)) return null;
  const sourceIndex = sourcePlaceIndex(weekIndex, placeIndex, school.places.length, fixedPlaceIndexes(school, day));
  if (sourceIndex === null) return null;
  const placeId = school.places[sourceIndex]?.id;
  if (!placeId) return null;
  return { day, placeId };
}

export function teacherIdAt(
  school: School,
  weekIndex: number,
  day: Weekday,
  placeIndex: number,
): string | null {
  const source = displayedSource(school, weekIndex, day, placeIndex);
  if (!source) return null;
  return school.assignment[source.day]?.[source.placeId] ?? null;
}

export function swapDisplayedCells(
  school: School,
  weekIndex: number,
  day: Weekday,
  placeIndexA: number,
  placeIndexB: number,
): School {
  if (placeIndexA === placeIndexB) return school;
  const sourceA = displayedSource(school, weekIndex, day, placeIndexA);
  const sourceB = displayedSource(school, weekIndex, day, placeIndexB);
  if (!sourceA || !sourceB) return school;
  if (sourceA.day === sourceB.day && sourceA.placeId === sourceB.placeId) return school;
  const pinned = new Set(school.teachers.filter((teacher) => teacher.pinned).map((teacher) => teacher.id));
  const occupantA = school.assignment[sourceA.day]?.[sourceA.placeId] ?? null;
  const occupantB = school.assignment[sourceB.day]?.[sourceB.placeId] ?? null;
  if ((occupantA && pinned.has(occupantA)) || (occupantB && pinned.has(occupantB))) return school;
  const assignment: School["assignment"] = { ...school.assignment };
  const rowA: DayAssignment = { ...(assignment[sourceA.day] ?? {}) };
  const rowB: DayAssignment = sourceA.day === sourceB.day ? rowA : { ...(assignment[sourceB.day] ?? {}) };
  const temp = rowA[sourceA.placeId] ?? null;
  rowA[sourceA.placeId] = rowB[sourceB.placeId] ?? null;
  rowB[sourceB.placeId] = temp;
  assignment[sourceA.day] = rowA;
  assignment[sourceB.day] = rowB;
  return { ...school, assignment };
}

export type ScheduleRow = {
  day: Weekday;
  dayLabel: string;
  cells: string[];
};

export type ScheduleGrid = {
  weekIndex: number;
  title: string;
  rangeLabel: string;
  placeNames: string[];
  rows: ScheduleRow[];
};

export function buildScheduleGrid(
  school: School,
  weekIndex: number,
  rangeLabel: string,
): ScheduleGrid {
  const teachers = new Map(school.teachers.map((teacher) => [teacher.id, teacher]));
  return {
    weekIndex,
    title: `${weekIndex + 1}. hafta`,
    rangeLabel,
    placeNames: school.places.map((place) => place.name),
    rows: school.days.map((day) => ({
      day,
      dayLabel: DAY_LABELS[day],
      cells: school.places.map((_, placeIndex) => {
        const teacherId = teacherIdAt(school, weekIndex, day, placeIndex);
        if (!teacherId) return "—";
        const teacher = teachers.get(teacherId);
        return teacher ? teacherName(teacher) : "—";
      }),
    })),
  };
}

export function duplicateTeacherIds(school: School, day: Weekday): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const place of school.places) {
    const teacherId = school.assignment[day]?.[place.id];
    if (!teacherId) continue;
    if (seen.has(teacherId)) duplicates.add(teacherId);
    seen.add(teacherId);
  }
  return [...duplicates];
}
