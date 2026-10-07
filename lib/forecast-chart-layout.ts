/** Presentation only: source values and release availability are never changed. */
type Domain = 'turnover' | 'hiring' | 'satisfaction';
export type ChartObservation = {month: string; value: number | null};
export const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
const monthAt = (index: number) => `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
export const chartPeriod = (month: string) => new Date(month + '-01T00:00:00Z').toLocaleDateString('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'});
export const hasChartValue = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

/** Point feedback reads the supplied value; no rounding, filling or interpolation. */
export function forecastPointFeedback(domain: Domain, month: string, value: number | null, method?: string) {
  const date = chartPeriod(month);
  const displayValue = value === null ? 'Unavailable' : (domain === 'hiring' ? value * 100 : value).toLocaleString('en-US', {maximumSignificantDigits:21}) + (domain === 'turnover' ? ' voluntary exits' : domain === 'hiring' ? '% within 90 days' : '% favorable-answer share');
  return {date, value:displayValue, series:method ? `Projection · ${method}` : 'Demo history'};
}

/** Place the compact point card near its anchor without escaping the viewport. */
export function forecastTooltipPosition(anchor: {left:number;right:number;top:number;bottom:number}, card: {width:number;height:number}, viewport: {left:number;top:number;width:number;height:number}) {
  const pad=8, left=Math.max(viewport.left+pad,Math.min((anchor.left+anchor.right-card.width)/2,viewport.left+viewport.width-card.width-pad));
  const above=anchor.top-card.height-pad, preferred=above>=viewport.top+pad?above:anchor.bottom+pad;
  return {left,top:Math.max(viewport.top+pad,Math.min(preferred,viewport.top+viewport.height-card.height-pad))};
}

/** Work in display units so both percentage domains have the same safeguards. */
export function forecastScale(domain: Domain, values: readonly (number | null | undefined)[]) {
  const factor = domain === 'hiring' ? 100 : 1;
  const ceiling = domain === 'turnover' ? Infinity : 100;
  const observed = values.filter(hasChartValue).map(value => value * factor);
  if (!observed.length) return null;
  const low = Math.min(...observed), high = Math.max(...observed), middle = (low + high) / 2;
  // At least five percentage points prevents tiny differences filling the plot.
  const minimumSpan = domain === 'turnover' ? Math.max(10, middle * .1) : 5;
  const span = Math.max((high - low) * 1.3, minimumSpan);
  const magnitude = 10 ** Math.floor(Math.log10(span / 4));
  const step = [1, 2, 2.5, 5, 10].find(value => value * magnitude >= span / 4)! * magnitude;
  const boundedSpan = Math.min(ceiling, span);
  const lower = Math.max(0, Math.min(middle - boundedSpan / 2, ceiling - boundedSpan));
  const min = Math.max(0, Math.floor(lower / step) * step);
  const max = Math.min(ceiling, Math.ceil((lower + boundedSpan) / step) * step);
  const ticks = Array.from({length: Math.round((max - min) / step) + 1}, (_, i) => Number((min + i * step).toFixed(8)));
  return {min: min / factor, max: max / factor, ticks: ticks.map(value => value / factor)};
}

/** Join only adjacent released observations at the domain's native cadence. */
export function historySegments(history: readonly ChartObservation[], cadence: number) {
  const segments: ChartObservation[][] = [];
  let active: ChartObservation[] = [];
  for (const row of history) {
    if (!hasChartValue(row.value) || (active.length && monthIndex(row.month) - monthIndex(active.at(-1)!.month) !== cadence)) {
      if (active.length) segments.push(active);
      active = [];
    }
    if (hasChartValue(row.value)) active.push(row);
  }
  if (active.length) segments.push(active);
  return segments;
}

/** Keep endpoints and year boundaries; thin only labels, never plotted dates. */
export function forecastDateTicks(start: string, end: string, cadence: number, plotWidth: number, firstProjection?: string) {
  const first = monthIndex(start), last = monthIndex(end), span = Math.max(1, last - first);
  const months = Array.from({length: Math.floor((last - first) / cadence) + 1}, (_, i) => monthAt(first + i * cadence));
  if (months.at(-1) !== end) months.push(end);
  const rotated = plotWidth / Math.max(1, months.length - 1) < 38;
  const minimumDistance = rotated ? 16 : 38;
  const selected = new Set<string>();
  const priority = [start, end, ...months.filter((month, i) => i > 0 && month.slice(0, 4) !== months[i - 1].slice(0, 4)), ...(firstProjection ? [firstProjection] : []), ...months];
  for (const month of priority) {
    if (monthIndex(month) < first || monthIndex(month) > last) continue;
    if ([...selected].every(other => Math.abs(monthIndex(month) - monthIndex(other)) / span * plotWidth >= minimumDistance)) selected.add(month);
  }
  const ticks = [...selected].sort().map((month, i, all) => ({
    month,
    label: chartPeriod(month).slice(0, 3),
    year: i === 0 || i === all.length - 1 || month.slice(0, 4) !== all[i - 1].slice(0, 4) ? month.slice(0, 4) : null,
  }));
  return {ticks, rotated};
}
