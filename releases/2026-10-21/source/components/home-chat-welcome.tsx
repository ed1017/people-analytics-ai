'use client';
import decision from './decision-style.module.css';
import {useChartPointerTooltip} from './chart-pointer-tooltip';
import {HomeRiskSummary} from './home-risk-summary';
import {HomeCompanyIntro} from './home-company-intro';
import {snapshotFindings} from '@/lib/key-findings';

import {HomeWorkforceFlows} from './home-workforce-flows';
import type {WorkforceFlow} from '@/lib/home-workforce-flows';
import { useId, type ReactNode } from 'react';
import type { HomeOverviewSummaryProps } from './home-overview-summary';
import type {HomeRecruitingKpi} from '@/lib/home-kpi-source';
import type { AppPage, HeadcountTrendPoint } from '@/lib/types';
import { isVerifiedDashboardScope } from '@/lib/dashboard-scope';
import type {CheckedHomeProjection} from '@/lib/home-projection-selection';
import styles from './home-chat-shell.module.css';
import {HomeConversationSplit,HomeSplitProvider} from './home-answer-visuals';
import {HomePromptCategories} from './home-prompt-categories';

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

/** Presentation only: pad observed values, with whole-person ticks and no invented observations. */
export function welcomeScale(values: readonly number[]) {
  const observed = values.filter(known);
  if (!observed.length) return null;
  const low = Math.min(...observed), high = Math.max(...observed), middle = (low + high) / 2;
  const span = Math.max((high - low) * 1.3, middle * .02, 2);
  const magnitude = 10 ** Math.floor(Math.log10(span / 4));
  const step = Math.max(1, Math.ceil([1, 2, 2.5, 5, 10].find(value => value * magnitude >= span / 4)! * magnitude));
  const min = Math.max(0, Math.floor((middle - span / 2) / step) * step);
  const max = Math.ceil((middle + span / 2) / step) * step;
  const ticks = Array.from({length: Math.round((max - min) / step) + 1}, (_, i) => min + i * step);
  return {min, max, ticks};
}

export type HomeChatWelcomeProps = Omit<HomeOverviewSummaryProps, 'onNavigate'> & {
  onReviewSyntheticCapacity?:()=>void;
  onQuestion: (question: string) => void;
  onNavigate: (page: AppPage) => void;
  disabled?: boolean;
  recruitingKpi?: HomeRecruitingKpi|null;
  recruitingPending?: boolean;
  flows?: WorkforceFlow[]|null;
  /** The owning chat supplies its existing composer; this component never submits requests. */
  composer?: ReactNode;
  templates?: ReactNode;
  plannerVisual?: ReactNode;
  /** From the same dataset-scoped dashboard response as overview and receipt. */
  trend?: readonly HeadcountTrendPoint[];
};

export type HomeSnapshotProps = Pick<HomeChatWelcomeProps, 'overview'|'receipt'|'requested'|'scopeLabel'|'loading'|'error'|'trend'>;
export function HomeHeadcountSummary({overview,receipt,requested,scopeLabel,loading,error,trend=[],recruitingKpi=null,recruitingPending=false,flows=null,projection=null,projectionStatus,onReviewSyntheticCapacity}:HomeSnapshotProps & {recruitingKpi?:HomeRecruitingKpi|null;recruitingPending?:boolean;flows?:WorkforceFlow[]|null;projection?:CheckedHomeProjection|null;projectionStatus?:string;onReviewSyntheticCapacity?:()=>void}) {
  const scopeId = useId();
  const {point:tooltipPoint,tooltip}=useChartPointerTooltip(JSON.stringify([requested,receipt,loading,error,overview?.snapshot_date,overview?.headcount,trend,projection,projectionStatus]));
  const verified = isVerifiedDashboardScope(receipt) && (['country', 'org', 'level'] as const).every(key => receipt?.effective?.[key] === requested[key]);
  const snapshotDate = overview?.snapshot_date ?? '';
  const current = !loading && !error && verified && validDate(snapshotDate) ? overview : null;
  const headcount = current?.headcount;
  const recruiting = current && recruitingKpi?.asOf===snapshotDate ? recruitingKpi : null;
  const recordedHistory = current && known(headcount) ? welcomeHistory(trend, snapshotDate, headcount) : [];
  const history = recordedHistory.filter(point=>point.snapshot_date.slice(0,4)===snapshotDate.slice(0,4));
  const pointDescription=(point:HeadcountTrendPoint)=>{const previous=recordedHistory.find(p=>monthIndex(p.snapshot_date)===monthIndex(point.snapshot_date)-1);const delta=previous?point.headcount-previous.headcount:null;return point.snapshot_date+' · '+point.headcount.toLocaleString()+' people'+(delta===null?'':' · Net change '+(delta>0?'+':'')+delta.toLocaleString()+' people from previous month');};
  const checked = current && projection?.analysis.inputs.asOf === snapshotDate && projection.analysis.inputs.opening === headcount && (['country','org','level'] as const).every(key=>projection.analysis.inputs.filters[key]===requested[key]) ? projection : null;
  const projected = checked?.analysis.points ?? [];
  const first = history[0], last = history.at(-1);
  const change = first && last && history.length>1 ? last.headcount-first.headcount : null;
  const dateLabel = (date:string) => new Date(date.slice(0,7)+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
  const horizonEnd = projected.at(-1)?.month ?? last?.snapshot_date;
  const flowTotal = (field:'hires'|'exits'|'transfersIn'|'transfersOut') => projected.reduce((sum,point)=>sum+point[field],0);
  const format = (value:number) => value.toLocaleString(undefined,{maximumFractionDigits:2});
  const scale = welcomeScale([...history.map(point => point.headcount), ...(checked ? [checked.analysis.inputs.opening] : []), ...projected.map(point=>point.headcount)]) ?? {min:0,max:1,ticks:[0,1]};
  const chartY = (value:number) => 96 - 76 * (value - scale.min) / (scale.max - scale.min);
  const axisLabel = 'Y axis: '+format(scale.min)+'–'+format(scale.max)+' people'+(scale.min>0?' (does not start at zero)':'')+'.';
  const periodContext = first && last ? 'Start: '+format(first.headcount)+' ('+dateLabel(first.snapshot_date)+'). Latest: '+format(last.headcount)+' ('+dateLabel(last.snapshot_date)+'). '+(change===null?'One snapshot; no change inferred.':'Net change: '+(change>0?'+':'')+format(change)+' people.') : '';
  const startMonth = monthIndex(first?.snapshot_date ?? snapshotDate);
  const monthSpan = horizonEnd ? monthIndex(horizonEnd) - startMonth : 0;
  const plot = history.map(point => ({...point, x: monthSpan ? 12 + 85 * (monthIndex(point.snapshot_date) - startMonth) / monthSpan : 54.5, y: chartY(point.headcount)}));
  const futurePlot = checked ? [{month:snapshotDate,headcount:checked.analysis.inputs.opening},...projected].map(point=>({...point,x:12+85*(monthIndex(point.month)-startMonth)/Math.max(1,monthSpan),y:chartY(point.headcount)})) : [];
  const dateMarks = [...new Set([first?.snapshot_date,history.length>2?history[Math.floor((history.length-1)/2)].snapshot_date:undefined,horizonEnd])].filter((date):date is string=>!!date);
  return <section aria-label="Workforce snapshot" className={`${decision.surface} ${styles.historySummary}`}>
      <section aria-label="Key findings" aria-describedby={scopeId} className={`${decision.hero} ${styles.findingsBanner}`}>
        <h3>Key findings</h3>
        {current ? <ul>{snapshotFindings(current, scopeLabel, true).items.map(item=><li key={item}>{item}</li>)}</ul> : <p role="status">{loading ? 'Updating findings…' : 'Verified findings unavailable.'}</p>}
      </section>

      {current&&<HomeRiskSummary key={JSON.stringify([requested,snapshotDate,receipt])} filters={requested} asOf={snapshotDate} onReviewSyntheticCapacity={onReviewSyntheticCapacity}/>}
      <p id={scopeId} className={styles.scope}>{scopeLabel}{current ? ` · As of ${snapshotDate}` : ''} · Recorded workforce history</p>
      <div className={styles.snapshotGrid}><div className={styles.snapshotCharts}>
        <p className={styles.chartHeadcount}>Current headcount <strong>{known(headcount) ? headcount.toLocaleString() : loading ? 'Updating…' : 'Unavailable'}</strong>{known(headcount) ? ' people' : ''}</p>
      {(first && last || checked) ? <figure className={styles.historyFigure}>
        <svg role="group" aria-label={'Recorded synthetic headcount history in people. ' + axisLabel + ' ' + periodContext + ' ' + scopeLabel + '. ' + history.map(point => point.snapshot_date + ': ' + point.headcount).join('; ') + '. Missing months are not connected. ' + (checked ? 'Conditional projection: '+projected.map(point=>point.month+': '+format(point.headcount)).join('; ') : 'No projection.')}>
          <line x1="12%" y1="96" x2="97%" y2="96" className={styles.chartAxis}/>
          {scale.ticks.map(tick=><g key={tick}><line x1="12%" y1={chartY(tick)} x2="97%" y2={chartY(tick)} className={styles.chartAxis}/><text x="10%" y={chartY(tick)+4} textAnchor="end">{format(tick)}</text></g>)}
          {dateMarks.map((date,index)=><text key={date} x={(monthSpan?12+85*(monthIndex(date)-startMonth)/monthSpan:54.5)+'%'} y="120" textAnchor={index===0?'start':index===dateMarks.length-1?'end':'middle'}>{dateLabel(date)}</text>)}
          {plot.map((point, index) => <g key={point.snapshot_date}>
            {index > 0 && monthIndex(point.snapshot_date) === monthIndex(plot[index - 1].snapshot_date) + 1 && <line x1={plot[index - 1].x+'%'} y1={plot[index - 1].y} x2={point.x+'%'} y2={point.y} className={styles.historyLine}/>}
            <circle {...tooltipPoint(pointDescription(point))} cx={point.x+'%'} cy={point.y} r="10" fill="transparent"/><circle aria-hidden="true" pointerEvents="none" cx={point.x+'%'} cy={point.y} r="3" className={styles.historyPoint}/>
          </g>)}
          {futurePlot.slice(1).map((point,index)=><line key={'projection-'+point.month} x1={futurePlot[index].x+'%'} y1={futurePlot[index].y} x2={point.x+'%'} y2={point.y} className={styles.projectionLine}/>)}
        </svg>
        <figcaption><span>{periodContext} </span>{history.length === 1 ? 'One recorded snapshot: ' + first?.snapshot_date + '; no trend inferred.' : history.length ? first?.snapshot_date + ' – ' + last?.snapshot_date + ' · ' + history.length + ' recorded monthly snapshots; gaps left unconnected.' : 'Recorded history unavailable.'}{checked && <span> Dashed: conditional projection through {horizonEnd?.slice(0,7)}.</span>}</figcaption>
      </figure> : <p className={styles.historyState} role="status">{loading ? 'Updating workforce history…' : 'Verified headcount history unavailable.'}</p>}
      {tooltip}
      {current&&<HomeWorkforceFlows rows={flows} asOf={snapshotDate}/>}</div>
      <ul className={styles.kpiRow} aria-label="Recorded workforce indicators">
        <li><span>Recruiting hires</span><b>{recruitingPending ? 'Loading…' : current&&recruitingKpi?.asOf===snapshotDate ? recruitingKpi.hires.toLocaleString() : 'Unavailable'}</b><em className={styles.kpiScope}>Company-wide</em><details className={styles.kpiDetail}><summary aria-label="Recruiting hires scope and definition">ⓘ</summary><small>Company-wide · monthly</small></details></li>
        <li><span>Voluntary turnover YTD</span><b>{loading ? 'Loading.' : known(current?.voluntary_turnover_ytd_pct) ? format(current.voluntary_turnover_ytd_pct)+'%' : 'Unavailable'}</b><details className={styles.kpiDetail}><summary aria-label="Voluntary turnover YTD scope and definition">ⓘ</summary><small>Source-reported · not annualized</small></details></li>
        <li><span>Average time to fill</span><b>{recruitingPending ? 'Loading.' : known(recruiting?.timeToFillDays) ? format(recruiting.timeToFillDays)+' days' : 'Unavailable'}</b><em className={styles.kpiScope}>Company-wide</em><details className={styles.kpiDetail}><summary aria-label="Average time to fill scope and definition">ⓘ</summary><small>Company-wide · {recruiting?.timeToFillCohort==='filled-requisitions-opening-to-closure' ? 'arithmetic mean, opening to closure for filled requisitions with both dates; internal and external fills' : 'source-reported arithmetic mean'} · through {snapshotDate || 'unavailable date'}</small></details></li>
        <li><span>FTE capacity</span><b>{loading ? 'Loading.' : known(current?.fte) ? format(current.fte)+' FTE' : 'Unavailable'}</b><details className={styles.kpiDetail}><summary aria-label="FTE capacity scope and definition">ⓘ</summary><small>Full-time-equivalent capacity · {current ? snapshotDate : 'Snapshot unavailable'}</small></details></li>
        <li><span>Open positions</span><b>{loading ? 'Loading.' : Number.isSafeInteger(current?.open_positions)&&known(current?.open_positions) ? format(current.open_positions)+' positions' : 'Unavailable'}</b><details className={styles.kpiDetail}><summary aria-label="Open positions scope and definition">ⓘ</summary><small>Recorded vacancies · {current ? snapshotDate : 'Snapshot unavailable'}</small></details></li>
        <li><span>Average open requisition age</span><b>{recruitingPending ? 'Loading.' : known(recruiting?.openReqAgeDays) ? format(recruiting.openReqAgeDays)+' days' : 'Unavailable'}</b><em className={styles.kpiScope}>Company-wide</em><details className={styles.kpiDetail}><summary aria-label="Average open requisition age scope and definition">ⓘ</summary><small>Company-wide · as of {snapshotDate || 'unavailable date'}</small></details></li>
        <li><span>Recruiting offers</span><b>{recruitingPending ? 'Loading.' : known(recruiting?.offers) ? format(recruiting.offers) : 'Unavailable'}</b><em className={styles.kpiScope}>Company-wide</em><details className={styles.kpiDetail}><summary aria-label="Recruiting offers scope and definition">ⓘ</summary><small>Company-wide · {recruiting?.month ?? 'month unavailable'}</small></details></li>
      </ul></div>
      <details className={styles.evidenceDetails}><summary>Sources and exact cost · {checked?"Conditional projection":projectionStatus==="checking"?"Checking projection":projectionStatus?"Projection unavailable":"No projection selected"}</summary>
        <p>{axisLabel} Recorded charts share the snapshot year; conditional projections are separately labeled.</p>
        {known(current?.labor_cost_usd)&&<details className={styles.exactCost}><summary>Labor cost: period unspecified</summary><p>{welcomeCurrency(current.labor_cost_usd).exact}. Cost period unspecified; no monthly or annual basis is inferred.</p></details>}
      <dl className={styles.movementNotes} aria-label="Workforce movements"><div><dt>Projected hires</dt><dd>{checked ? format(flowTotal('hires')) : 'Not available'}</dd></div><div><dt>Projected departures</dt><dd>{checked ? format(flowTotal('exits')) : 'Not available'}</dd></div></dl>
      {checked&&(flowTotal('transfersIn')>0||flowTotal('transfersOut')>0)&&<p className={styles.setupNote}>Also projected over this period: {format(flowTotal('transfersIn'))} transfers in and {format(flowTotal('transfersOut'))} transfers out.</p>}
      <p className={styles.setupNote}>{checked ? 'Projected people over '+projected[0].month.slice(0,7)+' – '+horizonEnd?.slice(0,7)+'. Assumption-based scenario, not a trained forecast.' : projectionStatus === 'checking' ? 'Checking the selected projection against current source inputs…' : projectionStatus ? 'Selected projection unavailable. Review it and choose Show on Home again.' : 'No projection selected. Set monthly hiring and departure assumptions in Scenarios.'}</p>
      {checked && <details className={styles.setupNote}><summary>Projection assumptions and source check</summary><p>Projection {checked.analysis.id}, revision {checked.analysis.revision}. Legacy live-source read checked {checked.checkedAt}; no immutable dataset certification.</p><p>Projected transfers in: {format(flowTotal('transfersIn'))}; out: {format(flowTotal('transfersOut'))} people over the same period.</p>{Object.entries(checked.analysis.assumptions).map(([field,value])=><p key={field}>{field.replaceAll('_',' ')}: {format(value!)}{field.endsWith('_pct')?'%':' people/month'}.</p>)}{[...checked.analysis.interpretations,...checked.analysis.limitations].map((text,index)=><p key={index}>{text}</p>)}</details>}

        <p>{recruitingPending ? 'Loading the company-wide monthly recruiting source.' : current&&recruitingKpi?.asOf===snapshotDate ? 'Recruiting: '+recruitingKpi.month+' through '+recruitingKpi.asOf+'; company-wide recruiting events, including internal fills. Not net workforce additions.' : 'Company-wide monthly recruiting source needed.'}</p>
        <p>{current ? 'Turnover: '+snapshotDate.slice(0,4)+'-01-01 through '+snapshotDate+'; selected workforce scope. Source-reported rate; not annualized.' : 'Verified scoped turnover needed.'}</p>
        <p>Sentiment requires an eligible survey result and suppression metadata; survey respondents are a separate population.</p>
        <p>{current ? 'Labor cost as of '+snapshotDate+'; selected workforce scope. Cost period unspecified; no monthly or annual basis is inferred.' : 'Verified scoped cost needed.'}</p>
      </details>
    </section>;
}

export function HomeChatWelcome({overview, receipt, requested, scopeLabel, loading, error, onQuestion, disabled = false, composer, templates, plannerVisual, trend = [], recruitingKpi, recruitingPending, flows,onReviewSyntheticCapacity}: HomeChatWelcomeProps) {
  return <section aria-label="Plan your workforce" className={styles.welcome}>
    <HomeConversationSplit enabled visuals={plannerVisual??<HomeHeadcountSummary onReviewSyntheticCapacity={onReviewSyntheticCapacity} overview={overview} receipt={receipt} requested={requested} scopeLabel={scopeLabel} loading={loading} error={error} trend={trend} recruitingKpi={recruitingKpi} recruitingPending={recruitingPending} flows={flows}/> }>
    <HomeCompanyIntro datasetToken={receipt?.version === 3 && isVerifiedDashboardScope(receipt) ? receipt.datasetToken : undefined} asOf={overview?.snapshot_date}/>
    <h3>What decision are you facing?</h3>
    <HomePromptCategories onQuestion={onQuestion} disabled={disabled} templates={templates}/>
    {composer && <div className={styles.composer}>{composer}</div>}
    </HomeConversationSplit>
  </section>;
}

/** Layout slot for the current conversation. Response/chart components remain owned by chat. */
export function HomeChatShell({children}: {children: ReactNode}) {
  return <HomeSplitProvider><div className={styles.shell}>{children}</div></HomeSplitProvider>;
}
