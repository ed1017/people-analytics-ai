// @ts-expect-error Native Node tests share TypeScript source.
import {resolveProjectionBacktest,projectionBacktestPrompt,projectionBacktestSummary} from '../projection-backtest.ts';
import release from '../data/synthetic-ta-calibrated-v2.json' with {type:'json'};
import targets from './calibration-targets-v2.json' with {type:'json'};
export type TaExtension = Omit<typeof release, 'history'> & {history:{month:string;active:number|null;complete:boolean}[]};
export const taExtension = release;
export function resolveTaExtension(candidate: unknown): TaExtension | null {
  try {return JSON.stringify(candidate) === JSON.stringify(release) ? release : null;} catch {return null;}
}
/** This release is calibrated only to legacy recruiting. A dataset-tagged
 * response needs its own release; equal totals or copied bytes are insufficient. */
export function isSeparateTaDataset(response: unknown): boolean {
  if(!response||typeof response!=='object')return false;
  const meta=(response as {data_meta?:unknown}).data_meta;
  if(meta===undefined)return false;
  if(!meta||typeof meta!=='object')return true;
  const value=meta as {datasetId?:unknown;datasetToken?:unknown;dataClass?:unknown};
  return value.datasetId!=='legacy-v1'||typeof value.datasetToken!=='string'||!/^legacy-v1:\d+$/.test(value.datasetToken)||value.dataClass==='constructed-synthetic';
}
export function resolveTaResponseExtension(response: unknown): TaExtension | null {
  if(!response||typeof response!=='object'||isSeparateTaDataset(response))return null;
  return resolveTaExtension((response as {modeled_extension?:unknown}).modeled_extension);
}
export function calibratedExtensionForSource(cutoff: unknown, summary: Record<string,unknown>, monthly: Record<string,unknown>[]) {
  const keys=['applications','interviewed_applications','offered_applications','hires','open_requisitions','open_positions','internal_hires','external_hires'] as const;
  const matches=cutoff===release.cutoff && keys.every(k=>summary[k]!==null&&summary[k]!==undefined&&Number(summary[k])===targets.summary[k]) && monthly.length===targets.monthly.length && targets.monthly.every(t=>{
    const row=monthly.find(r=>r.month===t.month);return row&&(['applications','hires','offers','interviewed_applications'] as const).every(k=>row[k]!==null&&row[k]!==undefined&&Number(row[k])===t[k]);
  });
  return matches ? release : null;
}
export function taExtensionPrompt(candidate: unknown) {
  const data=resolveTaExtension(candidate);
  if(!data)return 'The calibrated TA extension is unavailable or stale. Do not substitute the frozen 90-day opening-cohort example or invent screening/history/forecasts.';
  return 'CALIBRATED SYNTHETIC TA EXTENSION. Generated chronology and Screening=50% assumption; not repaired observed records. Company-wide, unfiltered. Current-status open 475 differs from September month-end 474 because one active req opened later. Active includes held; not hires, new openings or positions. Existing timing/aging and planning use separate source cohorts. Never infer role capacity, arrival dates or ROI. '+projectionBacktestPrompt('hiring',data)+' '+JSON.stringify(data);
}
export function taForecastAnswer(question: string) {
  if(/\b(?:hire counts?|how many hires|headcount|time.to.fill|time to hire|90.days?|start percentage|opening.cohort)\b/i.test(question))return 'The active-requisition projection does not forecast hire counts, headcount, time to fill or the 90-day opening-cohort start percentage. It estimates month-end active stock only.';
  const lines=['The hiring projection is **active requisitions at month-end**, including on-hold requisitions. **Generated synthetic history**, calibrated to the company-wide aggregate snapshot; no real identities or repaired observed records.',
    'Cutoff: **30 Sep 2026**. Source: **'+release.version+'**, calibration audit '+release.auditDate+'. September stock **474** differs from the current-status open inventory **475** because one active requisition opened later.',
    '| Method | Oct 2026 | Nov 2026 | Dec 2026 |','| --- | ---: | ---: | ---: |',
    ...(resolveProjectionBacktest('hiring',release)?.ranked.map(row=>row.method)??['carryForward','recentMean','dampedChange']).map(method=>{const key=method as 'carryForward'|'recentMean'|'dampedChange',name={carryForward:'Last count',recentMean:'Recent mean (3)',dampedChange:'Damped change'}[key];return '| '+name+' | '+release.forecasts.map(r=>r[key]).join(' | ')+' |'}),
    projectionBacktestSummary('hiring',release)+' All three remain stock baselines without operational validation. Confidence intervals and operational forecasts are unavailable. The cutoff-truncated generated fill ledger affects the recent trend. These counts are not future openings, hires, role capacity or arrival timing.',
    'The expanded funnel preserves 62,104 applications and 5,080 hires. Screening at 31,052 is a generated 50% assumption. Loaded timing, aging, dimensions and planning remain separate sources.',
    'Open [Talent Acquisition](app:talent-acquisition) for the same version, definitions and Details.'];
  return lines.slice(0,2).join('\n\n')+'\n\n'+lines.slice(2,7).join('\n')+'\n\n'+lines.slice(7).join('\n\n');
}
