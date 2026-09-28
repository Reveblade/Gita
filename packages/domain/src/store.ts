import { snapToMonday } from "./dates";
import { emptyAssignment } from "./school";
import {
  WEEKDAYS,
  type Place,
  type School,
  type Store,
  type Teacher,
  type Weekday,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function emptyStore(): Store {
  return { version: 1, activeSchoolId: null, schools: [] };
}

export function activeSchool(store: Store): School | null {
  return store.schools.find((school) => school.id === store.activeSchoolId) ?? null;
}

export function addSchool(store: Store, school: School): Store {
  return {
    ...store,
    activeSchoolId: school.id,
    schools: [...store.schools, school],
  };
}

export function deleteSchool(store: Store, schoolId: string): Store {
  const schools = store.schools.filter((school) => school.id !== schoolId);
  const activeSchoolId =
    store.activeSchoolId === schoolId ? (schools[0]?.id ?? null) : store.activeSchoolId;
  return { ...store, schools, activeSchoolId };
}

export function setActiveSchool(store: Store, schoolId: string): Store {
  if (!store.schools.some((school) => school.id === schoolId)) return store;
  return { ...store, activeSchoolId: schoolId };
}

export function mapActiveSchool(store: Store, update: (school: School) => School): Store {
  if (!store.activeSchoolId) return store;
  return {
    ...store,
    schools: store.schools.map((school) =>
      school.id === store.activeSchoolId ? update(school) : school,
    ),
  };
}

function parseTeacher(value: unknown): Teacher | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const firstName = asString(value.firstName);
  const lastName = asString(value.lastName);
  if (!id || !firstName || !lastName) return null;
  return {
    id,
    firstName,
    lastName,
    branch: typeof value.branch === "string" ? value.branch.trim() : "",
  };
}

function parsePlace(value: unknown): Place | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;
  return { id, name };
}

function parseDays(value: unknown): Weekday[] {
  if (!Array.isArray(value)) return ["mon", "tue", "wed", "thu", "fri"];
  const picked = new Set(value.filter((day): day is Weekday => WEEKDAYS.includes(day as Weekday)));
  const days = WEEKDAYS.filter((day) => picked.has(day));
  return days.length ? days : ["mon", "tue", "wed", "thu", "fri"];
}

function parseSchool(value: unknown): School {
  if (!isRecord(value)) throw new Error("Okul kaydı bozuk");
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) throw new Error("Okul adı veya kimliği yok");
  const teachers = Array.isArray(value.teachers)
    ? value.teachers.map(parseTeacher).filter((teacher): teacher is Teacher => teacher !== null)
    : [];
  const places = Array.isArray(value.places)
    ? value.places.map(parsePlace).filter((place): place is Place => place !== null)
    : [];
  const days = parseDays(value.days);
  const teacherIds = new Set(teachers.map((teacher) => teacher.id));
  const assignment = parseAssignment(value.assignment, days, places, teacherIds);
  const baseline =
    value.baseline === undefined
      ? parseAssignment(value.assignment, days, places, teacherIds)
      : parseAssignment(value.baseline, days, places, teacherIds);
  let termStart = "2026-09-07";
  if (typeof value.termStart === "string") {
    try {
      termStart = snapToMonday(value.termStart);
    } catch {
      termStart = "2026-09-07";
    }
  }
  const weekCount = typeof value.weekCount === "number" && Number.isFinite(value.weekCount)
    ? Math.min(52, Math.max(1, Math.round(value.weekCount)))
    : 18;
  return { id, name, termStart, weekCount, days, teachers, places, baseline, assignment };
}

function parseAssignment(
  raw: unknown,
  days: Weekday[],
  places: Place[],
  teacherIds: Set<string>,
): School["assignment"] {
  const rawAssignment = isRecord(raw) ? raw : {};
  const assignment = emptyAssignment(days, places);
  for (const day of days) {
    const rawDay = rawAssignment[day];
    if (!isRecord(rawDay)) continue;
    const row = assignment[day] ?? {};
    for (const place of places) {
      const teacherId = rawDay[place.id];
      row[place.id] = typeof teacherId === "string" && teacherIds.has(teacherId) ? teacherId : null;
    }
    assignment[day] = row;
  }
  return assignment;
}

export function parseStore(input: unknown): Store {
  if (!isRecord(input)) throw new Error("Kayıt bir nesne değil");
  if (input.version !== 1) throw new Error("Kayıt sürümü desteklenmiyor");
  if (!Array.isArray(input.schools)) throw new Error("Okul listesi yok");
  const schools = input.schools.map(parseSchool);
  const ids = new Set(schools.map((school) => school.id));
  if (ids.size !== schools.length) throw new Error("Okul kimlikleri çakışıyor");
  const requested = typeof input.activeSchoolId === "string" ? input.activeSchoolId : null;
  const activeSchoolId = requested && ids.has(requested) ? requested : (schools[0]?.id ?? null);
  return { version: 1, activeSchoolId, schools };
}
