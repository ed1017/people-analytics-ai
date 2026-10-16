'use client';

import { ChartNoAxesCombined, Sparkles, Wallet, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { HomeOverviewSummaryProps } from './home-overview-summary';
import type {HomeRecruitingKpi} from '@/lib/home-kpi-source';
import type { HeadcountTrendPoint } from '@/lib/types';
import { isVerifiedDashboardScope } from '@/lib/dashboard-scope';
import type {CheckedHomeProjection} from '@/lib/home-projection-selection';
import styles from './home-chat-shell.module.css';
import {swpDemoPrompt} from '@/lib/swp-demo';

export const planningQuestions = [
  'Do we have the people for our growth plan?',
  'How will AI change our teams?',
  'What will our workforce cost by 2029?',
  'Where are we at risk of losing key talent?',
] as const;
const icons = [ChartNoAxesCombined, Sparkles, Wallet, Users];
export const welcomeCurrency = (value:number) => ({compact:'USD '+new Intl.NumberFormat('en-US',{notation:value>=1000?'compact':'standard',maximumFractionDigits:2,minimumFractionDigits:value<1000?2:0}).format(value),exact:'USD '+value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:20})});
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
  recruitingKpi?: HomeRecruitingKpi|null;
  /** The owning chat supplies its existing composer; this component never submits requests. */
  composer?: ReactNode;
  /** From the same dataset-scoped dashboard response as overview and receipt. */
  trend?: readonly HeadcountTrendPoint[];
};

export type HomeSnapshotProps = Pick<HomeChatWelcomeProps, 'overview'|'receipt'|'requested'|'scopeLabel'|'loading'|'error'|'trend'>;
export function HomeHeadcountSummary({overview,receipt,requested,scopeLabel,loading,error,trend=[],recruitingKpi=null,projection=null,projectionStatus}:HomeSnapshotProps & {recruitingKpi?:HomeRecruitingKpi|null;projection?:CheckedHomeProjection|null;projectionStatus?:string}) {
  const verified = isVerifiedDashboardScope(receipt) && (['country', 'org', 'level'] as const).every(key => receipt?.effective?.[key] === requested[key]);
  const snapshotDate = overview?.snapshot_date ?? '';
  const current = !loading && !error && verified && validDate(snapshotDate) ? overview : null;
  const headcount = current?.headcount;
  const history = current && known(headcount) ? welcomeHistory(trend, snapshotDate, headcount) : [];
  const checked = current && projection?.analysis.inputs.asOf === snapshotDate && projection.analysis.inputs.opening === headcount && (['country','org','level'] as const).every(key=>projection.analysis.inputs.filters[key]===requested[key]) ? projection : null;
  const projected = checked?.analysis.points ?? [];
  const first = history[0], last = history.at(-1);
  const horizonEnd = projected.at(-1)?.month ?? last?.snapshot_date;
  const flowTotal = (field:'hires'|'exits'|'transfersIn'|'transfersOut') => projected.reduce((sum,point)=>sum+point[field],0);
  const format = (value:number) => value.toLocaleString(undefined,{maximumFractionDigits:2});
  const maximum = Math.max(1, checked?.analysis.inputs.opening ?? 0, ...history.map(point => point.headcount), ...projected.map(point=>point.headcount));
  const startMonth = monthIndex(first?.snapshot_date ?? snapshotDate);
  const monthSpan = horizonEnd ? monthIndex(horizonEnd) - startMonth : 0;
  const plot = history.map(point => ({...point, x: monthSpan ? 12 + 85 * (monthIndex(point.snapshot_date) - startMonth) / monthSpan : 54.5, y: 64 - 52 * point.headcount / maximum}));
  const futurePlot = checked ? [{month:snapshotDate,headcount:checked.analysis.inputs.opening},...projected].map(point=>({...point,x:12+85*(monthIndex(point.month)-startMonth)/Math.max(1,monthSpan),y:64-52*point.headcount/maximum})) : [];
  return <section aria-label="Workforce snapshot" className={styles.historySummary}>
      <div className={styles.historyHeading}>
        <div><p>Current headcount</p><strong>{known(headcount) ? headcount.toLocaleString() : loading ? 'Updating…' : 'Unavailable'}</strong><span>{known(headcount) ? ' people · ' + snapshotDate : ' · Verified snapshot needed'}</span></div>
        <p className={styles.watch}>Watch: Not assessed</p>
      </div>
      <p className={styles.scope}>{scopeLabel} · Recorded synthetic workforce history</p>
      {(first && last || checked) ? <figure className={styles.historyFigure}>
        <svg  role="img" aria-label={'Recorded synthetic headcount history in people. ' + scopeLabel + '. ' + history.map(point => point.snapshot_date + ': ' + point.headcount).join('; ') + '. Missing months are not connected. ' + (checked ? 'Conditional projection: '+projected.map(point=>point.month+': '+format(point.headcount)).join('; ') : 'No projection.')}>
          <line x1="12%" y1="64" x2="97%" y2="64" className={styles.chartAxis}/>
          <text x="10%" y="12" textAnchor="end">{maximum.toLocaleString()}</text><text x="10%" y="68" textAnchor="end">0</text>
          {plot.map((point, index) => <g key={point.snapshot_date}>
            {index > 0 && monthIndex(point.snapshot_date) === monthIndex(plot[index - 1].snapshot_date) + 1 && <line x1={plot[index - 1].x+'%'} y1={plot[index - 1].y} x2={point.x+'%'} y2={point.y} className={styles.historyLine}/>}
            <circle cx={point.x+'%'} cy={point.y} r="3" className={styles.historyPoint}/>
          </g>)}
          {futurePlot.slice(1).map((point,index)=><line key={'projection-'+point.month} x1={futurePlot[index].x+'%'} y1={futurePlot[index].y} x2={point.x+'%'} y2={point.y} className={styles.projectionLine}/>)}
        </svg>
        <figcaption>{history.length === 1 ? 'One recorded snapshot: ' + first?.snapshot_date + '; no trend inferred.' : history.length ? first?.snapshot_date + ' – ' + last?.snapshot_date + ' · ' + history.length + ' recorded monthly snapshots; gaps left unconnected.' : 'Recorded history unavailable.'}{checked && <span> Dashed: conditional projection through {horizonEnd?.slice(0,7)}.</span>}</figcaption>
      </figure> : <p className={styles.historyState} role="status">{loading ? 'Updating workforce history…' : 'Verified headcount history unavailable.'}</p>}
      <ul className={styles.kpiRow} aria-label="Recorded workforce indicators">
        <li><span>Recruiting hires</span><b>{current&&recruitingKpi?.asOf===snapshotDate ? recruitingKpi.hires.toLocaleString() : 'Unavailable'}</b><small>Company-wide · monthly</small></li>
        <li><span>Voluntary turnover YTD</span><b>{known(current?.voluntary_turnover_ytd_pct) ? format(current.voluntary_turnover_ytd_pct)+'%' : 'Unavailable'}</b><small>Source-reported · not annualized</small></li>
        <li><span>Current headcount</span><b>{known(headcount) ? format(headcount) : 'Unavailable'}</b><small>People · verified scope</small></li>
      </ul>
      <details className={styles.evidenceDetails}><summary>Sources and exact cost · {checked?"Conditional projection":projectionStatus==="checking"?"Checking projection":projectionStatus?"Projection unavailable":"Projection not configured"}</summary>
        {known(current?.labor_cost_usd)&&<details className={styles.exactCost}><summary>Labor cost: period unspecified</summary><p>{welcomeCurrency(current.labor_cost_usd).exact}. Cost period unspecified; no monthly or annual basis is inferred.</p></details>}
      <dl className={styles.movementNotes} aria-label="Workforce movements"><div><dt>Projected hires</dt><dd>{checked ? format(flowTotal('hires')) : 'Not available'}</dd></div><div><dt>Projected departures</dt><dd>{checked ? format(flowTotal('exits')) : 'Not available'}</dd></div></dl>
      {checked&&(flowTotal('transfersIn')>0||flowTotal('transfersOut')>0)&&<p className={styles.setupNote}>Also projected over this period: {format(flowTotal('transfersIn'))} transfers in and {format(flowTotal('transfersOut'))} transfers out.</p>}
      <p className={styles.setupNote}>{checked ? 'Projected people over '+projected[0].month.slice(0,7)+' – '+horizonEnd?.slice(0,7)+'. Assumption-based scenario, not a trained forecast.' : projectionStatus === 'checking' ? 'Checking the selected projection against current source inputs…' : projectionStatus ? 'Selected projection unavailable. Review it and choose Show on Home again.' : 'Projection not configured. Set monthly hiring and departure assumptions in Scenarios.'}</p>
      {checked && <details className={styles.setupNote}><summary>Projection assumptions and source check</summary><p>Projection {checked.analysis.id}, revision {checked.analysis.revision}. Legacy live-source read checked {checked.checkedAt}; no immutable dataset certification.</p><p>Projected transfers in: {format(flowTotal('transfersIn'))}; out: {format(flowTotal('transfersOut'))} people over the same period.</p>{Object.entries(checked.analysis.assumptions).map(([field,value])=><p key={field}>{field.replaceAll('_',' ')}: {format(value!)}{field.endsWith('_pct')?'%':' people/month'}.</p>)}{[...checked.analysis.interpretations,...checked.analysis.limitations].map((text,index)=><p key={index}>{text}</p>)}</details>}

        <p>{current&&recruitingKpi?.asOf===snapshotDate ? 'Recruiting: '+recruitingKpi.month+' through '+recruitingKpi.asOf+'; company-wide recruiting events, including internal fills. Not net workforce additions.' : 'Company-wide monthly recruiting source needed.'}</p>
        <p>{current ? 'Turnover: '+snapshotDate.slice(0,4)+'-01-01 through '+snapshotDate+'; selected workforce scope. Source-reported rate; not annualized.' : 'Verified scoped turnover needed.'}</p>
        <p>Sentiment requires an eligible survey result and suppression metadata; survey respondents are a separate population.</p>
        <p>{current ? 'Labor cost as of '+snapshotDate+'; selected workforce scope. Cost period unspecified; no monthly or annual basis is inferred.' : 'Verified scoped cost needed.'}</p>
      </details>
    </section>;
}

export function HomeChatWelcome({overview, receipt, requested, scopeLabel, loading, error, onQuestion, disabled = false, composer, trend = [], recruitingKpi}: HomeChatWelcomeProps) {
  return <section aria-label="Plan your workforce" className={styles.welcome}>
    <h2>Plan the workforce your business needs</h2>
    <p className={styles.subtitle}>Start with a decision. Explore the evidence, compare assumptions, and build your plan.</p>
    <div className={styles.entryActions}><button type="button" disabled={disabled} onClick={()=>onQuestion(swpDemoPrompt)}>Start the 3-minute demo</button><a href="?page=workforce">Explore the full app</a></div>
    <p className={styles.demoNote}>A fictional service-growth decision: edit assumptions, compare options, save a plan and review its target.</p>
    <HomeHeadcountSummary overview={overview} receipt={receipt} requested={requested} scopeLabel={scopeLabel} loading={loading} error={error} trend={trend} recruitingKpi={recruitingKpi}/>
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
