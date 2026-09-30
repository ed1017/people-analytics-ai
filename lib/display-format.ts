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

export function formatWholeCount(value: number) {
  return wholeCountFormatter.format(value);
}

export function formatCapacity(value: number) {
  return capacityFormatter.format(value);
}

export function formatFte(value: number) {
  return capacityFormatter.format(value);
}

export function formatPercent(value: number) {
  return percentFormatter.format(value) + "%";
}

export function formatSignedWholeDelta(value: number) {
  const prefix = value > 0 ? "+" : "";
  return prefix + formatWholeCount(value);
}

export function formatSignedCapacityDelta(value: number) {
  const prefix = value > 0 ? "+" : "";
  return prefix + formatCapacity(value);
}

export function formatSignedPercent(value: number) {
  const prefix = value > 0 ? "+" : "";
  return prefix + formatPercent(value);
}

export function formatCurrencyCompact(value: number) {
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
