/** A missing or invalid source measurement is unknown, never an observed zero. */
export function nullableNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function knownDifference(left: number | null | undefined, right: number | null | undefined): number | null {
  return typeof left === "number" && Number.isFinite(left) && typeof right === "number" && Number.isFinite(right)
    ? nullableNumber(left - right)
    : null;
}

/** Do not silently report a partial sum when any month or source value is unknown. */
export function knownSum(values: readonly (number | null | undefined)[]): number | null {
  if (!values.length || values.some(value => typeof value !== "number" || !Number.isFinite(value))) return null;
  return nullableNumber((values as number[]).reduce((sum, value) => sum + value, 0));
}
