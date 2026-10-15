'use client';

import { ChartNoAxesCombined, Sparkles, Wallet, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { HomeOverviewSummaryProps } from './home-overview-summary';
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

export type HomeChatWelcomeProps = Omit<HomeOverviewSummaryProps, 'onNavigate'> & {
  onQuestion: (question: string) => void;
  disabled?: boolean;
  /** The owning chat supplies its existing composer; this component never submits requests. */
  composer?: ReactNode;
};

export function HomeChatWelcome({overview, receipt, requested, scopeLabel, loading, error, onQuestion, disabled = false, composer}: HomeChatWelcomeProps) {
  const verified = isVerifiedDashboardScope(receipt) && (['country', 'org', 'level'] as const).every(key => receipt?.effective?.[key] === requested[key]);
  const snapshotDate = overview?.snapshot_date ?? '';
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(snapshotDate) && Number.isFinite(Date.parse(snapshotDate)) && new Date(snapshotDate).toISOString().slice(0, 10) === snapshotDate;
  const current = !loading && !error && verified && validDate ? overview : null;
  const headcount = current?.headcount;
  return <section aria-label="Plan your workforce" className={styles.welcome}>
    <h2>Plan the workforce you’ll need<br className={styles.titleBreak}/> as AI changes the work</h2>
    <p className={styles.subtitle}>Start with a decision. Explore the evidence, compare assumptions, and build your plan.</p>
    <dl className={styles.metrics}>
      <div><dt>Today</dt><dd>{known(headcount) ? headcount.toLocaleString() : loading ? 'Updating…' : 'Unavailable'}</dd><p>{known(headcount) ? `People · ${snapshotDate}` : 'Verified workforce snapshot needed'}</p></div>
      <div><dt>Leaving each year</dt><dd>Not configured</dd><p>An annual rate is not available here</p></div>
      <div><dt>Work AI could reshape</dt><dd>Not configured</dd><p>Task and adoption assumptions needed</p></div>
    </dl>
    <p className={styles.scope}>{scopeLabel} · Synthetic workforce evidence. No annual rate or AI impact is inferred.</p>
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
