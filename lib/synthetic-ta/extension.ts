import release from '../data/synthetic-ta-calibrated-v2.json' with {type:'json'};
import targets from './calibration-targets-v2.json' with {type:'json'};
export type TaExtension = Omit<typeof release, 'history'> & {history:{month:string;active:number|null;complete:boolean}[]};
export const taExtension = release;
export function resolveTaExtension(candidate: unknown): TaExtension | null {
  try {return JSON.stringify(candidate) === JSON.stringify(release) ? release : null;} catch {return null;}
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
  return 'CALIBRATED SYNTHETIC TA EXTENSION. Generated chronology and Screening=50% assumption; not repaired observed records. Company-wide, unfiltered. Current-status open 475 differs from September month-end 474 because one active req opened later. Active includes held; not hires, new openings or positions. Existing timing/aging and planning use separate source cohorts. Never infer role capacity, arrival dates or ROI. '+JSON.stringify(data);
}
export function taForecastAnswer(question: string) {
  if(/\b(?:hire counts?|how many hires|headcount|time.to.fill|time to hire|90.days?|start percentage|opening.cohort)\b/i.test(question))return 'The active-requisition projection does not forecast hire counts, headcount, time to fill or the 90-day opening-cohort start percentage. It estimates month-end active stock only.';
  const lines=['The hiring projection is **active requisitions at month-end**, including on-hold requisitions. **Generated synthetic history**, calibrated to the company-wide aggregate snapshot; no real identities or repaired observed records.',
    'Cutoff: **30 Sep 2026**. Source: **'+release.version+'**, calibration audit '+release.auditDate+'. September stock **474** differs from the current-status open inventory **475** because one active requisition opened later.',
    '| Method | Oct 2026 | Nov 2026 | Dec 2026 |','| --- | ---: | ---: | ---: |',
    ...([['Last count','carryForward'],['Recent mean (3)','recentMean'],['Damped change','dampedChange']] as const).map(([name,key])=>'| '+name+' | '+release.forecasts.map(r=>r[key]).join(' | ')+' |'),
    'All three methods are unvalidated stock baselines; none is selected as best. Confidence intervals and operational forecasts are unavailable. The cutoff-truncated generated fill ledger affects the recent trend. These counts are not future openings, hires, role capacity or arrival timing.',
    'The expanded funnel preserves 62,104 applications and 5,080 hires. Screening at 31,052 is a generated 50% assumption. Loaded timing, aging, dimensions and planning remain separate sources.',
    'Open [Talent Acquisition](app:talent-acquisition) for the same version, definitions and Details.'];
  return lines.slice(0,2).join('\n\n')+'\n\n'+lines.slice(2,7).join('\n')+'\n\n'+lines.slice(7).join('\n\n');
}
