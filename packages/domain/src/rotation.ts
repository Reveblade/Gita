export function mod(value: number, length: number): number {
  if (length <= 0) return 0;
  return ((value % length) + length) % length;
}

/**
 * Aynı günde yer kaydırır. `fixed` içindeki sıra numaraları haftadan bağımsız durur;
 * diğer yerler kendi halkalarında her hafta bir sonraki sıraya geçer.
 */
export function sourcePlaceIndex(
  weekIndex: number,
  placeIndex: number,
  placeCount: number,
  fixed: readonly number[],
): number | null {
  if (placeCount <= 0 || placeIndex < 0 || placeIndex >= placeCount) return null;
  const fixedSet = new Set(fixed);
  if (fixedSet.has(placeIndex)) return placeIndex;
  const ring: number[] = [];
  for (let index = 0; index < placeCount; index += 1) {
    if (!fixedSet.has(index)) ring.push(index);
  }
  const position = ring.indexOf(placeIndex);
  if (position < 0 || ring.length === 0) return null;
  return ring[mod(position - weekIndex, ring.length)] ?? null;
}

/** Hafta adımı aynı günün yerini kaydırır. Gün değişmez. */
export function sourceSlot(
  weekIndex: number,
  dayIndex: number,
  placeIndex: number,
  dayCount: number,
  placeCount: number,
): { dayIndex: number; placeIndex: number } {
  if (dayCount <= 0 || placeCount <= 0) return { dayIndex: 0, placeIndex: 0 };
  return {
    dayIndex,
    placeIndex: sourcePlaceIndex(weekIndex, placeIndex, placeCount, []) ?? 0,
  };
}
