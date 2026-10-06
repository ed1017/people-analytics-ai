import {normalizeHomePack} from './home-pack.mjs';

const rate=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const count=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
/** Read-only goal context. No new source access, scope changes, inferred denominators or group ranking. */
export function homeTurnoverFocus(goal:string,pack:unknown,query:string){
 if(!/\bturnover\b/i.test(goal)||/\b(?:involuntary|regrettable|retirement)\b/i.test(goal))return null;
 const voluntary=/\bvoluntary\b/i.test(goal),normalized=normalizeHomePack(pack),params=new URLSearchParams(query);
 const filtered=['country','org','level'].some(key=>{const value=params.get(key);return value&&value!=='all'});
 const scope=filtered?(normalized.workforceScope??'Selected workforce').replace(/^(?:Selected workforce snapshot:\s*)+/,''):'Company-wide';
 const a1=normalized.sources.find(source=>source.id==='A1'&&source.status==='loaded'),w1=normalized.sources.find(source=>source.id==='W1'&&source.status==='loaded');
 const source=filtered?w1:a1??w1;
 const date=source?.date,validDate=typeof date==='string'&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
 const years=goal.match(/\b20\d{2}\b/g)??[],matchingPeriod=validDate&&years.every(year=>date.startsWith(year));
 const facts:Record<string,unknown>|null=matchingPeriod&&source?.facts?source.facts as Record<string,unknown>:null;
 const metric=voluntary?'Voluntary turnover':'Overall turnover';
 const sourceId=source?.id;
 const period=validDate?'YTD through '+new Date(date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):null;
 const overallRate=sourceId==='A1'&&rate(facts?.total_turnover_ytd_pct)?facts.total_turnover_ytd_pct:null;
 const voluntaryRate=rate(facts?.voluntary_turnover_ytd_pct)?facts.voluntary_turnover_ytd_pct:null;
 const total=sourceId==='A1'&&count(facts?.total_exits)?facts.total_exits:null;
 const voluntaryCount=sourceId==='A1'&&count(facts?.voluntary_exits)?facts.voluntary_exits:null;
 const selectedRate=voluntary?voluntaryRate:overallRate,selectedCount=voluntary?voluntaryCount:total;
 const observations=[selectedRate===null?'':`${metric}: ${selectedRate}% ${period}.`,selectedCount===null?'':`${voluntary?'Voluntary exits':'Recorded exits (all types)'}: ${selectedCount} as of ${date}.`].filter(Boolean);
 // A1 group rows and denominators are not in the current Home contract. Reason shares,
 // selected snapshot headcount and simulated group forecasts cannot fill that gap.
 const groupLimitation='Comparable group turnover rates and denominators are unavailable in Home.';
 const scopedGoal=/\b(?:in|among|for|across)\b/i.test(goal);
 return {
  metric,scope,pinLabel:voluntary?'Pin voluntary turnover goal':scopedGoal?'Pin scoped turnover goal':'Pin overall turnover goal',
  context:observations.length?observations.join(' ')+` [${sourceId}]`:`${metric} figures for this scope${years.length?' and requested period':''} are unavailable in Home.`,
  groupLimitation,
  voluntary:!voluntary&&voluntaryRate!==null&&!(overallRate!==null&&voluntaryRate>overallRate)?{
   goal:goal.replace(/\b(?:(?:overall|total)\s+)?turnover\b/i,'voluntary turnover'),
   context:`Voluntary turnover: ${voluntaryRate}% ${period}${overallRate===null?'':`; total turnover: ${overallRate}% for the same period`}. ${scope}. [${sourceId}]`,
  }:null,
 };
}
export type HomeTurnoverFocus=ReturnType<typeof homeTurnoverFocus>;
