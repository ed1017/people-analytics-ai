'use client';

import { ChartNoAxesCombined, Sparkles, Wallet, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { HomeOverviewSummaryProps } from './home-overview-summary';
import type { HeadcountTrendPoint } from '@/lib/types';
import { isVerifiedDashboardScope } from '@/lib/dashboard-scope';
import styles from './home-chat-shell.module.css';

export const planningQuestions = [
  'Do we have the people for our growth plan?',
  'How will AI change our teams?',
  'What will our workforce cost by 2029?',
  'Where are we at risk of losing key talent?',
] as const;
const icons = [ChartNoAxesCombined, Sparkles, Wallet, Users];
const known = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));

/** The caller supplies one scoped dashboard response. Never infer or extend missing observations. */
export function welcomeHistory(trend: readonly HeadcountTrendPoint[], snapshotDate: string, headcount: number) {
  if (!Array.isArray(trend) || !trend.length || !validDate(snapshotDate) || !Number.isSafeInteger(headcount) || headcount < 0) return [];
  const months = new Set<number>();
  for (const point of trend) {
    if (!point || !validDate(point.snapshot_date) || point.snapshot_date > snapshotDate || !Number.isSafeInteger(point.headcount) || point.headcount < 0 || months.has(monthIndex(point.snapshot_date))) return [];
    months.add(monthIndex(point.snapshot_date));
  }
  const ordered = [...trend].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  const last = ordered.at(-1)!;
  return last.snapshot_date === snapshotDate && last.headcount === headcount ? ordered : [];
}

export type HomeChatWelcomeProps = Omit<HomeOverviewSummaryProps, 'onNavigate'> & {
  onQuestion: (question: string) => void;
  disabled?: boolean;
  /** The owning chat supplies its existing composer; this component never submits requests. */
  composer?: ReactNode;
  /** From the same dataset-scoped dashboard response as overview and receipt. */
  trend?: readonly HeadcountTrendPoint[];
};

export function HomeChatWelcome({overview, receipt, requested, scopeLabel, loading, error, onQuestion, disabled = false, composer, trend = []}: HomeChatWelcomeProps) {
  const verified = isVerifiedDashboardScope(receipt) && (['country', 'org', 'level'] as const).every(key => receipt?.effective?.[key] === requested[key]);
  const snapshotDate = overview?.snapshot_date ?? '';
  const current = !loading && !error && verified && validDate(snapshotDate) ? overview : null;
  const headcount = current?.headcount;
  const history = current && known(headcount) ? welcomeHistory(trend, snapshotDate, headcount) : [];
  const first = history[0], last = history.at(-1);
  const maximum = Math.max(1, ...history.map(point => point.headcount));
  const startMonth = first ? monthIndex(first.snapshot_date) : 0;
  const monthSpan = last ? monthIndex(last.snapshot_date) - startMonth : 0;
  const plot = history.map(point => ({...point, x: monthSpan ? 40 + 432 * (monthIndex(point.snapshot_date) - startMonth) / monthSpan : 256, y: 76 - 64 * point.headcount / maximum}));
  return <section aria-label="Plan your workforce" className={styles.welcome}>
    <h2>Plan the workforce you’ll need<br className={styles.titleBreak}/> as AI changes the work</h2>
    <p className={styles.subtitle}>Start with a decision. Explore the evidence, compare assumptions, and build your plan.</p>
    <section aria-label="Workforce snapshot" className={styles.historySummary}>
      <div className={styles.historyHeading}>
        <div><p>Current headcount</p><strong>{known(headcount) ? headcount.toLocaleString() : loading ? 'Updating…' : 'Unavailable'}</strong><span>{known(headcount) ? ' people · ' + snapshotDate : ' · Verified snapshot needed'}</span></div>
        <p className={styles.watch}>Watch: Not assessed</p>
      </div>
      <p className={styles.scope}>{scopeLabel} · Recorded synthetic workforce history</p>
      {first && last ? <figure className={styles.historyFigure}>
        <svg viewBox="0 0 488 88" role="img" aria-label={'Recorded synthetic headcount history in people. ' + scopeLabel + '. ' + history.map(point => point.snapshot_date + ': ' + point.headcount).join('; ') + '. Missing months are not connected. No projection.'}>
          <line x1="40" y1="76" x2="472" y2="76" className={styles.chartAxis}/>
          <text x="34" y="16" textAnchor="end">{maximum.toLocaleString()}</text><text x="34" y="80" textAnchor="end">0</text>
          {plot.map((point, index) => <g key={point.snapshot_date}>
            {index > 0 && monthIndex(point.snapshot_date) === monthIndex(plot[index - 1].snapshot_date) + 1 && <line x1={plot[index - 1].x} y1={plot[index - 1].y} x2={point.x} y2={point.y} className={styles.historyLine}/>}
            <circle cx={point.x} cy={point.y} r="3" className={styles.historyPoint}/>
          </g>)}
        </svg>
        <figcaption>{history.length === 1 ? 'One recorded snapshot: ' + first.snapshot_date + '; no trend inferred.' : first.snapshot_date + ' – ' + last.snapshot_date + ' · ' + history.length + ' recorded monthly snapshots; gaps left unconnected.'}</figcaption>
      </figure> : <p className={styles.historyState} role="status">{loading ? 'Updating workforce history…' : 'Verified headcount history unavailable.'}</p>}
      <dl className={styles.movementNotes} aria-label="Workforce movements"><div><dt>Hires</dt><dd>Not available</dd></div><div><dt>Departures</dt><dd>Not available</dd></div></dl>
      <p className={styles.setupNote}>Projection not configured. Set monthly hiring and departure assumptions in Scenarios.</p>
    </section>
    <h3>What decision are you facing?</h3>
    <div className={styles.questions}>
      {planningQuestions.map((question, index) => {
        const Icon = icons[index];
        return <button key={question} type="button" disabled={disabled} onClick={() => onQuestion(question)} className={index === 0 ? styles.featured : undefined}>
          <Icon size={19} aria-hidden="true"/><span>{question}</span>
        </button>;
      })}
    </div>
    {composer && <div className={styles.composer}>{composer}</div>}
  </section>;
}

/** Layout slot for the current conversation. Response/chart components remain owned by chat. */
export function HomeChatShell({children}: {children: ReactNode}) {
  return <div className={styles.shell}>{children}</div>;
}
