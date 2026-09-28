export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type Teacher = {
  id: string;
  firstName: string;
  lastName: string;
  branch: string;
};

export type Place = {
  id: string;
  name: string;
};

export type DayAssignment = Record<string, string | null>;

export type School = {
  id: string;
  name: string;
  termStart: string;
  weekCount: number;
  days: Weekday[];
  teachers: Teacher[];
  places: Place[];
  /** Öğretmen ekranındaki ilk nöbet. Sıfırla bunu tabloya geri yazar. */
  baseline: Partial<Record<Weekday, DayAssignment>>;
  /** Tablonun kullandığı atama. Haftalar bunun üzerinden kayar. */
  assignment: Partial<Record<Weekday, DayAssignment>>;
};

export type Store = {
  version: 1;
  activeSchoolId: string | null;
  schools: School[];
};

export const DAY_LABELS: Record<Weekday, string> = {
  mon: "Pazartesi",
  tue: "Salı",
  wed: "Çarşamba",
  thu: "Perşembe",
  fri: "Cuma",
  sat: "Cumartesi",
};

export const DAY_OFFSET: Record<Weekday, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
};

export const DEFAULT_DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];
