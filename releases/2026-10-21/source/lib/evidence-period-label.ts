// @ts-expect-error Native Node tests share TypeScript source.
import { validHistoryDate } from './history-date.ts';

/** Display only dates actually supplied by the evidence. */
export function evidenceAsOfLabel(value: unknown): string {
  if (!validHistoryDate(value)) return 'Source date unavailable';
  return 'As of ' + new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
}

export function evidenceMonthWindow(values: readonly unknown[]): string {
  if (!values.length || values.some(value => !validHistoryDate(value))) return 'Period unavailable';
  const dates = (values as readonly string[]).slice().sort();
  const format = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
  const first = format(dates[0]);
  const last = format(dates[dates.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}
