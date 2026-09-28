import { DAY_OFFSET, type School, type Weekday } from "./types";

export function parseISODate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error("Tarih YYYY-AA-GG olmalı");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("Geçersiz tarih");
  }
  return date;
}

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO(now = new Date()): string {
  return formatISODate(now);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Dönem başlangıcını içinde bulunduğu haftanın pazartesine çeker. Pazar bir önceki pazartesidir. */
export function snapToMonday(iso: string): string {
  const date = parseISODate(iso);
  const weekday = date.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return formatISODate(addDays(date, delta));
}

export function weekMonday(termStart: string, weekIndex: number): Date {
  return addDays(parseISODate(termStart), weekIndex * 7);
}

export function weekBounds(school: Pick<School, "termStart" | "days">, weekIndex: number): {
  start: Date;
  end: Date;
} {
  const monday = weekMonday(school.termStart, weekIndex);
  const offsets = school.days.map((day) => DAY_OFFSET[day]);
  const min = offsets.length ? Math.min(...offsets) : 0;
  const max = offsets.length ? Math.max(...offsets) : 0;
  return { start: addDays(monday, min), end: addDays(monday, max) };
}

export function formatWeekRange(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const full = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (sameMonth) {
    return `${start.getDate()}–${full.format(end)}`;
  }
  if (sameYear) {
    const dayMonth = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
    return `${dayMonth.format(start)} – ${full.format(end)}`;
  }
  return `${full.format(start)} – ${full.format(end)}`;
}

export function dayDate(termStart: string, weekIndex: number, day: Weekday): Date {
  return addDays(weekMonday(termStart, weekIndex), DAY_OFFSET[day]);
}
