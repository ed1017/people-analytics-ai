const wholeCountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const capacityFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatWholeCount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return wholeCountFormatter.format(value);
}

export function formatCapacity(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return capacityFormatter.format(value);
}

export function formatFte(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return capacityFormatter.format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return percentFormatter.format(value) + "%";
}

export function formatSignedWholeDelta(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  const prefix = value > 0 ? "+" : "";
  return prefix + formatWholeCount(value);
}

export function formatSignedCapacityDelta(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  const prefix = value > 0 ? "+" : "";
  return prefix + formatCapacity(value);
}

export function formatSignedPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  const prefix = value > 0 ? "+" : "";
  return prefix + formatPercent(value);
}

export function formatCurrencyCompact(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    return (
      sign +
      "$" +
      (absoluteValue / 1_000_000_000).toFixed(2) +
      "B"
    );
  }

  if (absoluteValue >= 1_000_000) {
    return (
      sign +
      "$" +
      (absoluteValue / 1_000_000).toFixed(1) +
      "M"
    );
  }

  if (absoluteValue >= 1_000) {
    return (
      sign +
      "$" +
      (absoluteValue / 1_000).toFixed(1) +
      "K"
    );
  }

  return sign + "$" + wholeCountFormatter.format(absoluteValue);
}

/** Fixed-decimal metric with its unit only when a measurement exists. */
export function formatMetric(value: number | null | undefined, decimals = 1, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Unavailable";
  return value.toFixed(decimals) + suffix;
}
