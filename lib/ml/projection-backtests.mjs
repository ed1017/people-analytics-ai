import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {generateWorkforceCase,replaySynthetic} from './synthetic-workforce/pipeline.mjs';
import {monthAdd,monthEnd} from './synthetic-workforce/common.mjs';
import {forecastTurnover,scoreTurnover} from './synthetic-domain-predictions/turnover.mjs';
import {forecastSatisfaction,scoreSatisfaction} from './synthetic-domain-predictions/satisfaction.mjs';
import {buildSyntheticDomainDemo} from './synthetic-domain-demo.mjs';
import {forecast as forecastStock,monthEnd as stockMonthEnd} from '../synthetic-ta/v1.ts';

const root=new URL('../../',import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const VERSION='projection-backtest-ranking-v1';
export const POOLS={turnover:['recent-mean-3','seasonal-naive-12','linear-trend-12'],satisfaction:['last-wave','recent-mean-3','linear-trend-8'],hiring:['carryForward','recentMean','dampedChange']};
const TIE_TOLERANCE=1e-10,MINIMUM_ORIGINS=3;
const admissible=(rows,cutoff)=>rows.filter(row=>row.effectiveAt<=cutoff&&row.simulatedAvailableAt<=cutoff);

/** Every method must score every target at the same origin; no method-specific cherry-picking. */
export function summarizeBacktest(domain,cases,excluded,source,cutoff){
 const pool=POOLS[domain];
 const common=cases.filter(c=>pool.every(method=>Number.isSafeInteger(c.scores[method]?.n)&&c.scores[method].n===c.targets.length&&Number.isFinite(c.scores[method].mae)&&c.scores[method].mae>=0));
 const comparable=common.length>=MINIMUM_ORIGINS&&pool.length>=3;
 const samples=common.reduce((sum,c)=>sum+c.targets.length,0);
 const scores=comparable?pool.map(method=>({method,n:samples,mae:common.reduce((sum,c)=>sum+c.scores[method].mae*c.scores[method].n,0)/samples})):[];
 scores.sort((a,b)=>Math.abs(a.mae-b.mae)<=TIE_TOLERANCE?pool.indexOf(a.method)-pool.indexOf(b.method):a.mae-b.mae);
 const ranked=scores.map(s=>({...s,rank:1+scores.filter(other=>other.mae<s.mae-TIE_TOLERANCE).length}));
 return {domain,status:comparable?'ranked':'unavailable',reason:comparable?null:`Requires at least ${MINIMUM_ORIGINS} common historical origins and three eligible methods; ${common.length} common origins available.`,source,cutoff,
  metric:'MAE',unit:domain==='satisfaction'?'percentage points of respondent favorable-answer share':domain==='turnover'?'monthly voluntary exits':'active requisitions',
  horizons:domain==='satisfaction'?'Next calendar quarter after each quarter-end origin':'1, 2 and 3 calendar months after each month-end origin, equally weighted',
  pool:[...pool],eligibleOrigins:common.length,scoredTargets:samples,uniqueTargetPeriods:[...new Set(common.flatMap(c=>c.targets))].sort(),ranked,
  minimumOrigins:MINIMUM_ORIGINS,tieTolerance:TIE_TOLERANCE,tiePolicy:'Equal MAE within 1e-10 shares a rank; original fixed-pool order breaks display ties, not accuracy ties.',
  scope:'Ranking only among these three existing methods on this same versioned synthetic history. No broader model search or real-workforce validation. These selection scores are not an independent evaluation of the selected ordering. Overlapping targets are repeated forecast tasks, not independent observations.',
  cases:common,excluded:[...excluded,...cases.filter(c=>!common.includes(c)).map(c=>({origin:c.origin,reasons:['not-all-methods-have-comparable-scores']}))]};
}

/** Uses release vintages at each origin; final labels never cross the current display cutoff. */
export function backtestReleasedDomain(domain,releases,{cutoff,startMonth,source}){
 const bounded=admissible(releases,cutoff),finalReplay=replaySynthetic(domain,bounded,cutoff),cases=[],excluded=[];
 const [forecast,score]=domain==='turnover'?[forecastTurnover,scoreTurnover]:[forecastSatisfaction,scoreSatisfaction];
 for(let month=startMonth;month<cutoff.slice(0,7);month=monthAdd(month,1)){
  if(domain==='satisfaction'&&!/-(03|06|09|12)$/.test(month))continue;
  const origin=monthEnd(month),targets=domain==='satisfaction'?[monthAdd(month,3)]:[1,2,3].map(h=>monthAdd(month,h));
  if(targets.at(-1)>cutoff.slice(0,7)){excluded.push({origin,reasons:['target-beyond-current-cutoff']});continue;}
  const available=admissible(bounded,origin);
  if(!available.length){excluded.push({origin,reasons:['no-releases-available-at-origin']});continue;}
  const snapshot=replaySynthetic(domain,available,origin),result=forecast(snapshot,targets);
  if(result.status!=='predicted'){excluded.push({origin,reasons:result.reasons});continue;}
  const scored=score(finalReplay,result.predictions);
  if(scored.status!=='scored'){excluded.push({origin,reasons:scored.reasons});continue;}
  const labels=targets.map(target=>finalReplay.records.find(row=>row.effectiveAt.startsWith(target)));
  assert(labels.every(row=>row&&row.effectiveAt>origin&&row.simulatedAvailableAt<=cutoff));
  assert(snapshot.records.every(row=>row.effectiveAt<=origin&&row.simulatedAvailableAt<=origin));
  cases.push({origin,targets,trainingEnd:snapshot.records.at(-1)?.effectiveAt,latestTrainingAvailableAt:snapshot.records.reduce((latest,r)=>r.simulatedAvailableAt>latest?r.simulatedAvailableAt:latest,''),
   labelsAvailableAt:labels.map(row=>row.simulatedAvailableAt),scores:scored.methods});
 }
 return summarizeBacktest(domain,cases,excluded,source,cutoff);
}

export function backtestStock(data){
 const cases=[],excluded=[],cutoff=data.cutoff;
 const history=data.history.filter(row=>stockMonthEnd(row.month)<=cutoff);
 for(let i=0;i<history.length-1;i++){
  const origin=stockMonthEnd(history[i].month),predictions=forecastStock(history.slice(0,i+1),origin);
  if(predictions.length!==3){excluded.push({origin,reasons:['three-consecutive-complete-training-months-required']});continue;}
  const targets=predictions.map(p=>p.month),labels=targets.map(month=>history.find(row=>row.month===month));
  if(labels.some(row=>!row||!row.complete||!Number.isSafeInteger(row.active)||row.active<0)){excluded.push({origin,reasons:['three-complete-future-labels-by-current-cutoff-required']});continue;}
  const scores=Object.fromEntries(POOLS.hiring.map(method=>[method,{n:3,mae:predictions.reduce((sum,p,j)=>sum+Math.abs(p[method]-labels[j].active),0)/3}]));
  cases.push({origin,targets,trainingEnd:origin,latestTrainingAvailableAt:origin,labelsAvailableAt:labels.map(r=>stockMonthEnd(r.month)),scores});
 }
 return summarizeBacktest('hiring',cases,excluded,{version:data.version,sha256:sha(data),basis:'Generated complete monthly stock; event-date availability assumption; not recovered source history.'},cutoff);
}

export async function buildProjectionBacktests(){
 const displayed=await read('lib/data/synthetic-domain-demo-v1.json'),stock=await read('lib/data/synthetic-ta-calibrated-v2.json');
 assert.deepEqual(await buildSyntheticDomainDemo(),displayed,'Frozen source/implementation reproduction failed');
 assert.deepEqual(forecastStock(stock.history,stock.cutoff),stock.forecasts,'Stock forecast reproduction failed');
 const protocol=await read('lib/ml/synthetic-workforce/protocol.json');
 const generated=generateWorkforceCase({...protocol,seeds:[displayed.seed]},{seed:displayed.seed,family:displayed.family});
 const domains={};
 for(const [domain,forecast] of [['turnover',forecastTurnover],['satisfaction',forecastSatisfaction]]){
  const releases=admissible(generated.domains[domain].releases,displayed.cutoff),snapshot=replaySynthetic(domain,releases,displayed.cutoff),d=displayed.domains[domain];
  const current=forecast(snapshot,d.rows.map(row=>row.month));
  assert.deepEqual(current.predictions.map(row=>({month:row.month,values:d.methods.map(method=>row[method])})),d.rows,'Displayed predictions must match this exact case');
  for(const row of d.history){const match=snapshot.records.find(r=>r.effectiveAt.startsWith(row.month));assert.equal(match?.value[domain==='turnover'?'voluntaryExits':'scorePct'],row.value);assert.equal(match.simulatedAvailableAt,row.availableAt);}
  domains[domain]=backtestReleasedDomain(domain,releases,{cutoff:displayed.cutoff,startMonth:protocol.startMonth,source:{version:'synthetic-domain-demo-v1',sha256:sha(displayed),generatorVersion:generated.generatorVersion,seed:displayed.seed,family:displayed.family,reportSha256:displayed.evidence.reportSha256,releasedHistoryCount:snapshot.records.length,basis:'Same frozen synthetic population and released vintages as the displayed forecast; earlier history replayed from its existing generator.'}});
 }
 domains.hiring=backtestStock(stock);
 return {version:VERSION,selection:'Lowest unrounded common-target historical MAE within each fixed three-method pool; no cross-domain score comparison.',domains};
}
