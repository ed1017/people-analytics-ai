import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {openingCohorts,observeOpeningCohorts} from '../fixtures/opening-known-hiring.mjs';
import {fitOpeningModel,predictOpeningModel} from '../../lib/ml/opening-known-hiring.mjs';
import {classifyHiringCohorts,summarizeClassifications} from '../../lib/ml/hiring-classifier-evaluation.mjs';
const root=new URL('../../',import.meta.url),hash=s=>createHash('sha256').update(s).digest('hex');
export function educationalGate(families){
 if(families.length!==3||!['stable','mix-shift','relationship-reversal'].every(name=>families.some(f=>f.family===name)))return false;
 if(families.some(f=>Object.values(f.methods).some(m=>!Number.isFinite(m.brier)||!Number.isFinite(m.logLoss)||m.positives<=0||m.negatives<=0)))return false;
 return families.filter(f=>f.family!=='relationship-reversal').every(f=>{
  const m=f.methods['logistic-features'];return m.balancedAccuracy>=.6&&m.brier<=f.methods['pooled-rate'].brier-.02&&m.brier<=f.methods['cell-rate'].brier+.005;
 });
}
export function calibration(rows,predictions,method){
 const bins=Array.from({length:5},(_,i)=>({lower:i/5,upper:(i+1)/5,openings:0,started:0,predictedStarts:0}));
 rows.forEach((r,i)=>{const p=predictions[i][method],b=bins[Math.min(4,Math.floor(p*5))];b.openings+=r.openings;b.started+=r.started;b.predictedStarts+=r.openings*p;});
 return bins.map(b=>({...b,meanPrediction:b.openings?b.predictedStarts/b.openings:null,observedFraction:b.openings?b.started/b.openings:null}));
}
export async function evaluateOpeningKnown(mode='assessment',observe=observeOpeningCohorts){
 if(!['development','assessment'].includes(mode))throw Error('Invalid mode');
 const protocol=JSON.parse(await readFile(new URL('docs/opening-known-hiring-protocol.json',root),'utf8'));
 const seeds=mode==='development'?protocol.developmentSeeds:Array.from({length:protocol.assessmentSeedCount},(_,i)=>protocol.assessmentSeedStart+i);
 const months=[];for(let y=2022;y<=2025;y++)for(let m=1;m<=12;m++){const month=`${y}-${String(m).padStart(2,'0')}`;if(month<=protocol.lastTrainingMonth)months.push(month);}
 const pending=protocol.families.flatMap(family=>seeds.map(seed=>{
  const train=observe(family,seed,openingCohorts(family,months),protocol.origin),model=fitOpeningModel(train,protocol.origin);
  const features=openingCohorts(family,protocol.testMonths);
  const predictions=features.map(row=>({...predictOpeningModel(model,row,row.openedAt),key:row.key,predictedAt:row.openedAt}));
  return {family,seed,model,features,predictions};
 }));
 // All frozen models and opening-time predictions exist before assessment labels.
 const cases=pending.map(c=>{
  const actual=observe(c.family,c.seed,c.features,protocol.scoreThrough);
  if(actual.some(r=>r.started+r.cancelled+r.unresolved!==r.openings))throw Error('Incomplete outcome accounting');
  const counts=Object.fromEntries(protocol.methods.map(method=>[method,classifyHiringCohorts(actual.map(r=>({...r,month:r.key})),c.predictions.map(p=>({...p,month:p.key})),method,protocol.threshold)]));
  return {...c,actual,counts};
 });
 const families=protocol.families.map(family=>{
  const selected=cases.filter(c=>c.family===family);
  const actual=selected.flatMap(c=>c.actual),predictions=selected.flatMap(c=>c.predictions);
  return {family,histories:selected.length,testCells:actual.length,methods:Object.fromEntries(protocol.methods.map(m=>[m,{...summarizeClassifications(selected.map(c=>c.counts[m])),calibration:calibration(actual,predictions,m)}])),
   example:{seed:selected[0].seed,features:selected[0].features.slice(0,8),predictions:selected[0].predictions.slice(0,8),actual:selected[0].actual.slice(0,8)}};
 });
 const paths=['docs/opening-known-hiring-protocol.json','tests/fixtures/opening-known-hiring.mjs','lib/ml/opening-known-hiring.mjs','lib/ml/hiring-classifier-evaluation.mjs','tests/manual/evaluate-opening-known-hiring.mjs'];
 const files=Object.fromEntries(await Promise.all(paths.map(async p=>[p,hash((await readFile(new URL(p,root),'utf8')).replace(/\r\n/g,'\n'))])));
 return {version:protocol.version,mode,protocol,files,educationalGatePassed:educationalGate(families),operationallyQualified:false,realWorldPerformanceValidated:false,families,cases};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const flag=process.argv[2];if(!['--development','--write','--check'].includes(flag))throw Error('Choose development, write or check');
 const report=await evaluateOpeningKnown(flag==='--development'?'development':'assessment');
 const text=JSON.stringify(report,null,2)+'\n';
 if(flag!=='--development'){
  const path=new URL('docs/evidence/opening-known-hiring-v1.json',root);
  if(flag==='--write')await writeFile(path,text);else if((await readFile(path,'utf8')).replace(/\r\n/g,'\n')!==text)throw Error('Evidence differs');
 }
 console.log(JSON.stringify({mode:report.mode,gate:report.educationalGatePassed,families:report.families.map(f=>({family:f.family,methods:Object.fromEntries(Object.entries(f.methods).map(([k,m])=>[k,{n:m.openings,brier:m.brier,balancedAccuracy:m.balancedAccuracy}]))}))},null,2));
}
