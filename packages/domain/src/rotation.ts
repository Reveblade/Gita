export function mod(value: number, length: number): number {
  if (length <= 0) return 0;
  return ((value % length) + length) % length;
}

/** Hafta adımı önce günü, günler bir tam tur yapınca yeri kaydırır. */
export function sourceSlot(
  weekIndex: number,
  dayIndex: number,
  placeIndex: number,
  dayCount: number,
  placeCount: number,
): { dayIndex: number; placeIndex: number } {
  if (dayCount <= 0 || placeCount <= 0) return { dayIndex: 0, placeIndex: 0 };
  const step = mod(weekIndex, dayCount * placeCount);
  const dayShift = step % dayCount;
  const placeShift = Math.floor(step / dayCount);
  return {
    dayIndex: mod(dayIndex - dayShift, dayCount),
    placeIndex: mod(placeIndex - placeShift, placeCount),
  };
}
