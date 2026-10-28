/** Read-only boundary for a versioned Lab aggregate export. No network, storage or model calls. */
type Row = Record<string, unknown>;
export type FowWeighting = 'cost' | 'headcount';
export type FowCoverage = 'complete' | 'partial' | 'unavailable';
export type FowProvenance = 'consistent' | 'mixed' | 'unknown';
export type FowTask = {id: number; text: string; share: number; label: string | null; score: number | null; runId: string | null};
export type FowJob = {key: string; title: string; functionName: string; family: string; suppressed: boolean; headcount: number | null; cost: number | null; score: number | null; exposedShare: number | null; automateShare: number | null; augmentShare: number | null; coverage: FowCoverage; coverageShare: number | null; provenance: FowProvenance; runIds: string[]; tasks: FowTask[]};
export type FowFunction = {name: string; total: boolean; suppressed: boolean; headcount: number | null; score: number | null; exposedShare: number | null; automateShare: number | null; augmentShare: number | null; coverage: FowCoverage; provenance: FowProvenance};
export type FowAdoption = {level: string; functionName: string | null; family: string | null; suppressed: boolean; headcount: number | null; active: number | null; licensed: number | null; activeRate: number | null; licensedActiveRate: number | null; week: string | null; score: number | null};
export type FowAction = {functionName: string; move: string; text: string; createdAt: string; basis: 'exported-snapshot'; state: 'matched' | 'changed' | 'unverifiable'; matching: number; changed: number; missing: number; metrics: number};
export type FowRegister = {id: string; name: string; tier: string | null; owner: string | null; status: string; overdue: boolean; biasAuditDue: boolean; nextReview: string | null};
export type FowValidation = {sampleSize: number | null; reviewed: number | null; complete: boolean; agreement: number | null; weightedAgreement: number | null; kappa: number | null; stability: number | null; retestTasks: number | null};
export type FowRun = {id: string; model: string | null; rubric: string | null; promptSha: string | null; status: string; finishedAt: string | null};
export type FowLabModel = {
  dataset: {id: string; name: string; asOf: string; headcount: number | null; scopeLabel: string};
  meta: {version: string; sourceCommit: string; exportedAt: string};
  jobs: FowJob[]; actions: FowAction[]; register: FowRegister[]; validation: FowValidation; scoringRuns: FowRun[];
  functions: {cost: FowFunction[]; headcount: FowFunction[]}; adoption: {cost: FowAdoption[]; headcount: FowAdoption[]}; issues: string[];
};

const object = (v: unknown, label: string): Row => {if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(`Invalid Lab ${label}.`); return v as Row;};
const rows = (v: unknown, label: string): Row[] => {if (!Array.isArray(v)) throw Error(`Invalid Lab ${label}.`); return v.map(x => object(x, label));};
const text = (v: unknown, label: string): string => {if (typeof v !== 'string' || !v.trim()) throw Error(`Invalid Lab ${label}.`); return v;};
const optionalText = (v: unknown): string | null => v == null ? null : text(v, 'text');
const number = (v: unknown, label: string, max = Infinity, integer = false, min = 0): number | null => {
  if (v == null) return null;
  if (typeof v !== 'number' && !(typeof v === 'string' && /^-?\d+(?:\.\d+)?$/.test(v))) throw Error(`Invalid Lab ${label}.`);
  const n = Number(v); if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw Error(`Invalid Lab ${label}.`); return n;
};
const count = (v: unknown, label = 'count') => number(v, label, Infinity, true);
const rate = (v: unknown, label = 'rate') => number(v, label, 1);
const bool = (v: unknown, label: string): boolean => {if (typeof v !== 'boolean') throw Error(`Invalid Lab ${label}.`); return v;};
const date = (v: unknown, label: string): string => {const s = text(v, label); if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(`${s.slice(0,10)}T00:00:00Z`).toISOString().slice(0,10)!==s.slice(0,10)) throw Error(`Invalid Lab ${label}.`); return s;};
const close = (a: number, b: number) => Math.abs(a-b) <= 0.00001;
// fow.v_exposure_adoption rounds rates to four decimals; retain its exact denominator semantics.
const sameRoundedRate = (a: number,b: number) => Math.abs(a-b)<=0.00005000001;
const unique = (values: string[], label: string) => {if (new Set(values).size !== values.length) throw Error(`Duplicate Lab ${label}.`);};
const LABELS: Record<string, number> = {automate: 1, augment: .5, unaffected: 0};
const KEYS: Record<string, string[]> = {
  v_function_exposure: ['dataset_id','is_total','function_name'], v_exposure_adoption: ['dataset_id','level','function_name','family_name'], v_job_exposure: ['dataset_id','job_key'],
  v_register: ['use_case_id'], v_adoption_manager: ['function_name','team_number'], v_pulse_sentiment: ['level','function_name','question_code','response_date'],
  v_function_readiness: ['dataset_id','level','function_name'], v_function_skill_gaps: ['dataset_id','function_name','skill_code','importance'],
  v_redeployment_paths: ['dataset_id','from_job_key','to_job_key'], v_course_catalog: ['course_code'],
};
const scalarEqual = (a: unknown, b: unknown) => a === b || (typeof a === 'number' && typeof b === 'number' && close(a,b)) || (typeof a === 'string' && /^-?\d+(?:\.\d+)?$/.test(a) && typeof b === 'number' && close(Number(a),b)) || (typeof b === 'string' && /^-?\d+(?:\.\d+)?$/.test(b) && typeof a === 'number' && close(a,Number(b)));

/** Native view rows plus flat taskDetails [{job_key,task_id,time_share,task_text,label,exposure,run_id}]. */
export function buildFowLabModel(value: unknown): FowLabModel {
  const source = object(value,'snapshot'), d = object(source.dataset,'dataset'), m = object(source.meta,'metadata');
  const dataset = {id: text(d.id,'dataset id'), name: text(d.name,'dataset name'), asOf: date(d.asOf,'as-of date'), headcount: count(d.headcount), scopeLabel: text(d.scopeLabel,'scope label')};
  const meta = {version: text(m.version,'version'), sourceCommit: text(m.sourceCommit,'source commit'), exportedAt: date(m.exportedAt,'export date')};
  const rawJobs = rows(source.jobs,'jobs'), rawFunctions = rows(source.functions ?? source.functionExposure,'functions'), rawAdoption = rows(source.adoption,'adoption');
  for (const r of [...rawJobs,...rawFunctions,...rawAdoption]) if (r.dataset_id !== dataset.id) throw Error('Lab dataset scope mismatch.');
  const taskRows = rows(source.taskDetails,'task details'), runRows = rows(source.scoringRuns,'scoring runs');
  unique(runRows.map(r => text(r.run_id,'run id')),'run id');
  const scoringRuns:FowRun[]=runRows.map(r=>({id:text(r.run_id,'run id'),model:optionalText(r.model),rubric:optionalText(r.rubric_version),promptSha:optionalText(r.prompt_sha),status:text(r.status,'run status'),finishedAt:r.finished_at==null?null:date(r.finished_at,'run completion')}));
  const runs = new Map(runRows.map(r => [text(r.run_id,'run id'),r]));
  const issues: string[] = [];
  const jobs: FowJob[] = rawJobs.map(r => {
    const key = text(r.job_key,'job key'), headcount = count(r.headcount), cost = number(r.labor_cost_usd,'labor cost');
    const suppressed = bool(r.suppressed,'suppression') || (headcount !== null && headcount < 10);
    const ts = taskRows.filter(t => t.job_key === key);
    unique(ts.map(t => String(count(t.task_id,'task id'))),`tasks for ${key}`);
    const tasks: FowTask[] = ts.map(t => {
      const id = count(t.task_id,'task id'), share = rate(t.time_share,'task share'); if (id === null || id < 1 || share === null) throw Error('Invalid Lab task.');
      const label = optionalText(t.label), score = rate(t.exposure,'task exposure');
      if (label !== null && (!(label in LABELS) || score !== LABELS[label])) throw Error('Lab task label/score mismatch.');
      if (label === null && score !== null) throw Error('Lab task score lacks label.');
      return {id,text:text(t.task_text,'task text'),share,label,score,runId:optionalText(t.run_id)};
    });
    const total = tasks.reduce((s,t)=>s+t.share,0), scored = tasks.filter(t=>t.label !== null), coverageShare = tasks.length ? scored.reduce((s,t)=>s+t.share,0) : null;
    const declaredTotal = count(r.tasks_total,'task count'), declaredScored = count(r.tasks_scored,'scored count'), declaredCoverage = rate(r.score_coverage,'score coverage');
    const coverage: FowCoverage = !tasks.length || !scored.length ? 'unavailable' : close(total,1) && scored.length===tasks.length && (declaredTotal === null || declaredTotal===tasks.length) && (declaredScored===null || declaredScored===scored.length) && (declaredCoverage===null || close(declaredCoverage,coverageShare!)) ? 'complete' : 'partial';
    const runIds = [...new Set(scored.flatMap(t=>t.runId ? [t.runId] : []))];
    const proven = scored.length > 0 && scored.every(t => {const run=t.runId ? runs.get(t.runId):undefined;return run?.status==='succeeded' && typeof run.rubric_version==='string' && !!run.rubric_version && typeof run.prompt_sha==='string' && !!run.prompt_sha && typeof run.model==='string' && !!run.model;});
    const provenance: FowProvenance = !proven ? 'unknown' : runIds.length===1 ? 'consistent':'mixed';
    const automate = tasks.reduce((s,t)=>s+(t.label==='automate'?t.share:0),0), augment=tasks.reduce((s,t)=>s+(t.label==='augment'?t.share:0),0), computed=automate+.5*augment;
    const native = {score:rate(r.exposure_score,'job exposure'),exposedShare:rate(r.exposed_share,'exposed share'),automateShare:rate(r.automate_share,'automate share'),augmentShare:rate(r.augment_share,'augment share')};
    if (coverage==='complete' && ((native.score!==null&&!close(native.score,computed)) || (native.exposedShare!==null&&!close(native.exposedShare,automate+augment)) || (native.automateShare!==null&&!close(native.automateShare,automate)) || (native.augmentShare!==null&&!close(native.augmentShare,augment)))) throw Error(`Lab exposure reconciliation failed for ${key}.`);
    if (coverage!=='complete'||provenance!=='consistent') issues.push(`${key}: ${coverage} coverage, ${provenance} provenance`);
    const usable = coverage==='complete'&&provenance==='consistent';
    return {key,title:text(r.title,'job title'),functionName:text(r.function_name,'function'),family:text(r.family_name,'family'),suppressed,headcount:suppressed?null:headcount,cost:suppressed?null:cost,...native,score:usable?native.score:null,exposedShare:usable?native.exposedShare:null,automateShare:usable?native.automateShare:null,augmentShare:usable?native.augmentShare:null,coverage,coverageShare,provenance,runIds,tasks};
  });
  unique(jobs.map(j=>j.key),'job key');
  if (taskRows.some(t=>!jobs.some(j=>j.key===t.job_key))) throw Error('Lab task refers to unknown job.');
  const functions = (weighting:FowWeighting):FowFunction[] => rawFunctions.map(r=>{
    const total=bool(r.is_total,'total'), name=total?'Company':text(r.function_name,'function'), relevant=jobs.filter(j=>total||j.functionName===name), headcount=count(r.headcount), suppressed=bool(r.suppressed,'suppression')||(headcount!==null&&headcount<10);
    const coverage:FowCoverage=!relevant.length||relevant.every(j=>j.coverage==='unavailable')?'unavailable':relevant.every(j=>j.coverage==='complete')?'complete':'partial';
    const runIds=new Set(relevant.flatMap(j=>j.runIds));
    const provenance:FowProvenance=relevant.some(j=>j.provenance==='unknown')||!relevant.length?'unknown':runIds.size===1?'consistent':'mixed';
    const suffix=weighting==='cost'?'cost':'hc', usable=!suppressed&&coverage==='complete'&&provenance==='consistent';
    const native={score:rate(r[`exposure_score_${suffix}`]),exposedShare:rate(r[`exposed_share_${suffix}`]),automateShare:rate(r[`automate_share_${suffix}`]),augmentShare:rate(r[`augment_share_${suffix}`])};
    if(native.score!==null&&native.automateShare!==null&&native.augmentShare!==null&&!close(native.score,native.automateShare+.5*native.augmentShare))throw Error('Lab function score mismatch.');
    if(native.exposedShare!==null&&native.automateShare!==null&&native.augmentShare!==null&&!close(native.exposedShare,native.automateShare+native.augmentShare))throw Error('Lab function share mismatch.');
    // Reconcile public weights when all constituents are available; never reconstruct suppressed weights.
    const weightKey=weighting==='cost'?'cost':'headcount';
    if(usable&&relevant.every(j=>j[weightKey]!==null&&j.score!==null)){
      const weight=relevant.reduce((sum,j)=>sum+j[weightKey]!,0);
      if(weight>0&&native.score!==null&&!close(native.score,relevant.reduce((sum,j)=>sum+j[weightKey]!*j.score!,0)/weight))throw Error('Lab weighted exposure mismatch.');
    }
    return {name,total,suppressed,headcount:suppressed?null:headcount,score:usable?native.score:null,exposedShare:usable?native.exposedShare:null,automateShare:usable?native.automateShare:null,augmentShare:usable?native.augmentShare:null,coverage,provenance};
  });
  const adoption = (weighting:FowWeighting):FowAdoption[] => rawAdoption.map(r=>{
    const headcount=count(r.headcount), suppressed=bool(r.suppressed,'suppression')||(headcount!==null&&headcount<10), active=count(r.weekly_active_users), licensed=count(r.licensed_employees), activeRate=rate(r.weekly_active_rate), licensedActiveRate=rate(r.weekly_active_rate_licensed);
    if (active!==null&&headcount!==null&&active>headcount)throw Error('Lab active users exceed headcount.');
    if (licensed!==null&&headcount!==null&&licensed>headcount)throw Error('Lab licensed users exceed headcount.');
    if (active!==null&&headcount!==null&&headcount>0&&activeRate!==null&&!sameRoundedRate(active/headcount,activeRate))throw Error('Lab adoption denominator mismatch.');
    if (active!==null&&licensed!==null&&licensed>0&&licensedActiveRate!==null&&!sameRoundedRate(active/licensed,licensedActiveRate))throw Error('Lab licensed denominator mismatch.');
    const fn=optionalText(r.function_name), family=optionalText(r.family_name), relevant=jobs.filter(j=>(!fn||j.functionName===fn)&&(!family||j.family===family));
    const usable=!suppressed&&relevant.length>0&&relevant.every(j=>j.coverage==='complete'&&j.provenance==='consistent')&&new Set(relevant.flatMap(j=>j.runIds)).size===1;
    const score=rate(r[weighting==='cost'?'exposure_score_cost':'exposure_score_hc']);
    return {level:text(r.level,'adoption level'),functionName:fn,family,suppressed,headcount:suppressed?null:headcount,active:suppressed?null:active,licensed:suppressed?null:licensed,activeRate:suppressed?null:activeRate,licensedActiveRate:suppressed?null:licensedActiveRate,week:r.week_start==null?null:date(r.week_start,'usage week'),score:usable?score:null};
  });
  const rawRegister=rows(source.register,'register');
  const register:FowRegister[]=rawRegister.map(r=>({id:text(r.use_case_id,'use-case id'),name:text(r.name,'use-case name'),tier:optionalText(r.risk_tier),owner:optionalText(r.owner),status:text(r.status,'use-case status'),overdue:bool(r.is_overdue,'overdue'),biasAuditDue:bool(r.bias_audit_due,'audit due'),nextReview:r.next_review_date==null?null:date(r.next_review_date,'review date')}));
  const views:Record<string,Row[]>={v_function_exposure:rawFunctions,v_exposure_adoption:rawAdoption,v_job_exposure:rawJobs,v_register:rawRegister};
  if(source.evidenceViews!=null)for(const [key,value] of Object.entries(object(source.evidenceViews,'evidence views')))if(KEYS[key]&&!views[key])views[key]=rows(value,`evidence ${key}`);
  const actions:FowAction[]=rows(source.actions,'actions').map(r=>{
    if(r.dataset_id!==dataset.id)throw Error('Lab action dataset mismatch.');
    let matching=0,changed=0,missing=0,metrics=0;const seen=new Set<string>();
    for(const e of rows(r.evidence,'action evidence')){
      const view=text(e.view,'evidence view'), key=object(e.key,'evidence key'), field=text(e.field,'evidence field');
      if(e.kind==='metric')metrics++;
      const identity=JSON.stringify([view,Object.entries(key).sort(),field]);
      if(seen.has(identity)){missing++;continue;}seen.add(identity);
      const required=KEYS[view], completeKey=required&&required.length===Object.keys(key).length&&required.every(k=>Object.hasOwn(key,k));
      const candidates=completeKey?(views[view]??[]).filter(v=>required.every(k=>Object.hasOwn(v,k)&&scalarEqual(v[k],key[k]))):[];
      if(candidates.length!==1||candidates[0].suppressed===true||candidates[0][field]==null||e.value==null){missing++;continue;}
      if(/^(exposure_score|exposed_share|automate_share|augment_share)/.test(field)){
        const scoped=jobs.filter(j=>(key.job_key==null||key.job_key===j.key)&&(key.function_name==null||key.function_name===j.functionName)&&(key.family_name==null||key.family_name===j.family));
        if(!scoped.length||scoped.some(j=>j.coverage!=='complete'||j.provenance!=='consistent')||new Set(scoped.flatMap(j=>j.runIds)).size!==1){missing++;continue;}
      }
      if(scalarEqual(candidates[0][field],e.value))matching++;else changed++;
    }
    return {functionName:text(r.scope_key,'action function'),move:text(r.move,'action move'),text:text(r.text,'action text'),createdAt:date(r.created_at,'action date'),basis:'exported-snapshot',state:missing||metrics<2?'unverifiable':changed?'changed':'matched',matching,changed,missing,metrics};
  });
  const v=source.validation==null?{}:object(source.validation,'validation'), sampleSize=count(v.sampleSize),reviewed=count(v.reviewed);
  if(sampleSize!==null&&reviewed!==null&&reviewed>sampleSize)throw Error('Lab reviewed count exceeds sample.');
  const validation:FowValidation={sampleSize,reviewed,complete:sampleSize!==null&&sampleSize>0&&reviewed===sampleSize,agreement:reviewed?rate(v.agreement):null,weightedAgreement:reviewed?rate(v.weightedAgreement):null,kappa:reviewed?number(v.kappa,'kappa',1,false,-1):null,stability:rate(v.stability),retestTasks:count(v.retestTasks)};
  if(!validation.retestTasks)validation.stability=null;
  return {dataset,meta,jobs,functions:{cost:functions('cost'),headcount:functions('headcount')},adoption:{cost:adoption('cost'),headcount:adoption('headcount')},actions,register,validation,scoringRuns,issues};
}

/** Filters Lab functions only; never implies equivalence with ed-ai business units. */
export function getFowLabView(model:FowLabModel, options:{functionName?:string|null;weighting?:FowWeighting}={}){
  const weighting=options.weighting??'cost';if(weighting!=='cost'&&weighting!=='headcount')throw Error('Invalid Lab weighting.');
  const functionName=options.functionName??null;
  if(functionName&&!model.functions[weighting].some(f=>!f.total&&f.name===functionName))throw Error('Unknown Lab function.');
  const company=model.functions[weighting].find(f=>f.total)??null;
  const selected=functionName?model.functions[weighting].find(f=>f.name===functionName&&!f.total)??null:company;
  const adoption=model.adoption[weighting], companyAdoption=adoption.find(r=>r.level==='company')??null;
  const families=adoption.filter(r=>r.level==='family'&&(!functionName||r.functionName===functionName));
  const enableFirst=families.filter(r=>!r.suppressed&&r.score!==null&&r.activeRate!==null&&companyAdoption?.score!=null&&companyAdoption.activeRate!=null&&r.score>companyAdoption.score&&r.activeRate<companyAdoption.activeRate);
  const newest=model.actions.reduce((latest,a)=>Date.parse(a.createdAt)>Date.parse(latest||'1970-01-01')?a.createdAt:latest,'');
  return {weighting,functionName,company,selected,functions:model.functions[weighting].filter(f=>!f.total&&(!functionName||f.name===functionName)),jobs:model.jobs.filter(j=>!functionName||j.functionName===functionName),adoption:adoption.filter(r=>!functionName||r.functionName===functionName),families,enableFirst,actions:model.actions.filter(a=>a.createdAt===newest&&(!functionName||a.functionName===functionName)),register:model.register,validation:model.validation};
}
