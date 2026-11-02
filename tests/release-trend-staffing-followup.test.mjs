import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
import {groupStaffingCommand} from '../releases/2026-10-21/source/lib/group-staffing-followup.ts';
import {PUBLIC_9037} from '../releases/2026-10-21/source/lib/public-9037-contract.mjs';
const app=new URL('../releases/2026-10-21/source/',import.meta.url),require=createRequire(new URL('package.json',app)),ts=require('typescript'),React=require('react');
const groups=['Managed Services','Technology','Consulting','Corporate','Digital','Data','Sales','Client Operations'].map((label,i)=>({code:i?'BU-'+i:'BU-MGSVC',label,asOf:'2026-09-30',headcount:100,fte:90,exits:9,historyMonths:9,history:['2026-06-30','2026-07-31','2026-08-31','2026-09-30'].map((snapshot_date,j)=>({snapshot_date,headcount:103-j,fte:93-j}))}));
test('parser resolves reviewed aliases and selected pronouns without accepting ambiguous or unsupported scope',()=>{
 for(const text of ['Fill the Managed Service gap','Close the Managed Services gap'])assert.equal(groupStaffingCommand(text,groups,'BU-1').code,'BU-MGSVC');
 assert.equal(groupStaffingCommand('Fill this gap',groups,'BU-1').code,'BU-1');assert.equal(groupStaffingCommand('Fill that group gap',groups,'BU-MGSVC').code,'BU-MGSVC');
 for(const text of ['Fill Managed Services and Technology gaps','Fill gaps','Fill this gap by country','Fill this gap over 13 months','Fill this gap for 0 months','Fill this gap next quarter'])assert.ok(groupStaffingCommand(text,groups,'BU-MGSVC').error,text);
 for(const text of ['Fill Managed Services gap in Canada','Fill this gap by December 2026','Fill this gap with demand -1 FTE','Set demand to 120 FTE and hire 5 people','Use current FTE with demand 80 FTE','Use current FTE with demand -1 FTE','Fill this gap over 3 months for 6 months'])assert.ok(groupStaffingCommand(text,groups,'BU-MGSVC').error,text);
 assert.equal(groupStaffingCommand('What is turnover?',groups,'BU-MGSVC'),null);assert.equal(groupStaffingCommand('Set demand to -1 FTE',groups,'BU-MGSVC').error!==null,true);
 assert.equal(groupStaffingCommand('Fill this gap over 6 months',groups,'BU-MGSVC').months,6);
});
function harness(file,props,extra={}){let cursor=0,dirty=false,effects=[],tree;const hooks=[];
 const react={...React,useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return[hooks[i],v=>{const n=typeof v==='function'?v(hooks[i]):v;if(!Object.is(n,hooks[i])){hooks[i]=n;dirty=true;}}];},useRef(v){const i=cursor++;return hooks[i]??(hooks[i]={current:v});},useEffect(fn,deps){const i=cursor++,old=hooks[i];if(!old||!deps||!old.deps||deps.some((v,j)=>v!==old.deps[j])){hooks[i]={deps};effects.push(()=>{old?.cleanup?.();hooks[i].cleanup=fn();});}}};
 const modules={'react':react,...extra},module={exports:{}};const load=id=>modules[id]??(id==='react/jsx-runtime'?require(id):id.startsWith('@/lib/')?require(new URL(id.slice(2)+(id.endsWith('.mjs')?'':'.ts'),app).pathname.replace(/^\/([A-Z]:)/,'$1')):new Proxy({},{get:(_,key)=>String(key)}));
 const code=ts.transpileModule(fs.readFileSync(new URL('components/'+file,app),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const saved=new Map();new Function('module','exports','require','localStorage',code)(module,module.exports,load,{setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)??null});
 const Component=module.exports[file==='group-capacity-risk.tsx'?'GroupCapacityRisk':'GroupWorkforceTrend'];
 function render(){let rounds=0;do{dirty=false;cursor=0;effects=[];tree=Component(props);effects.forEach(fn=>fn());assert.ok(++rounds<30);}while(dirty);return tree;}
 function nodes(n){if(Array.isArray(n))return n.flatMap(nodes);if(!n||typeof n!=='object')return[];return[n,...Object.entries(n.props??{}).filter(([k])=>!['groups','context'].includes(k)).flatMap(([,v])=>typeof v==='object'?nodes(v):[])];}
 return {props,saved,render,find:(type)=>nodes(tree).find(n=>n.type===type),all:()=>nodes(tree),async settle(){for(let i=0;i<8;i++){render();await new Promise(r=>setImmediate(r));}render();}};
}
test('real trend controller preserves edited selected group and horizon, and saves only on explicit action',()=>{
 const ref={current:null},h=harness('group-workforce-trend.tsx',{groups,months:3,selected:'BU-MGSVC',onSelect(){},onClose(){},storageKey:'test',controlRef:ref},{'@/lib/dataset-client.mjs':{datasetSession:{snapshot:()=>PUBLIC_9037.token}}});h.render();
 const slider=label=>h.all().find(n=>n.type==='PlanningAssumptionSlider'&&n.props.label===label);
 slider('Net FTE change per month').props.onChange('-2');h.render();slider('Projection horizon').props.onChange('6');h.render();
 const snapshot=ref.current.read('BU-MGSVC');assert.equal(snapshot.edited,true);assert.equal(snapshot.result.months,6);assert.equal(snapshot.result.deltaFte,-12);assert.equal(h.saved.size,0);
 h.all().find(n=>n.type==='button'&&n.props.children==='Save trend scenario').props.onClick();h.render();assert.equal(h.saved.size,1);
 assert.equal(ref.current.read('BU-1').edited,false);assert.equal(ref.current.read('unknown'),null);assert.equal(ref.current.read('BU-MGSVC',13),null);
});
test('real staffing commands preserve unknowns, explicit demand and exact trend handoff without automatic saves',async()=>{
 let activeToken=PUBLIC_9037.token;const commandRef={current:null},client={datasetSession:{snapshot:()=>activeToken,subscribe:()=>()=>{}},datasetFetch:async()=>({ok:true,json:async()=>({business_units:groups.map(g=>({org_code:g.code}))})})};
 const h=harness('group-capacity-risk.tsx',{months:3,question:'Which groups are at risk of capacity gaps?',scopeQuery:'',onClose(){},commandRef},{'@/lib/dataset-client.mjs':client,'@/lib/group-capacity-risk-source':{readCapacityRiskGroups:()=>groups}});await h.settle();
 const trend=h.find('GroupWorkforceTrend');assert.ok(trend);const th=harness('group-workforce-trend.tsx',trend.props,{'@/lib/dataset-client.mjs':client});th.render();
 const slider=th.all().find(n=>n.type==='PlanningAssumptionSlider'&&n.props.label==='Net FTE change per month');slider.props.onChange('-2');th.render();
 assert.match(commandRef.current('Fill the Managed Service gap over 6 months'),/What productive FTE demand/);h.render();
 const demand=()=>h.all().find(n=>n.type==='PlanningAssumptionSlider'&&/demand/i.test(n.props.label));assert.equal(demand().props.value,'');
 const source=h.find('StandaloneScenarioBackup').props.context;assert.equal(source.months,6);assert.equal(h.saved.size,0);th.render();
 const otherInputs=()=>h.all().filter(n=>(n.type==='PlanningAssumptionSlider'&&!/demand/i.test(n.props.label))||n.type==='input').map(n=>[n.props.label??n.props.placeholder,n.props.value]);const beforeInputs=otherInputs();
 assert.match(commandRef.current('Use current FTE'),/90 productive FTE/);h.render();assert.equal(demand().props.value,'90');assert.deepEqual(otherInputs(),beforeInputs,'explicit baseline changes demand only');
 commandRef.current('Set demand to 120 FTE');h.render();commandRef.current('Fill this gap');h.render();assert.equal(demand().props.value,'120');
 for(const text of ['Fill Managed Services gap in Canada','Fill this gap by December 2026','Fill this gap with demand -1 FTE','Set demand to 120 FTE and hire 5 people','Use current FTE with demand 80 FTE','Use current FTE with demand -1 FTE','Fill this gap over 3 months for 6 months']){const before=otherInputs();assert.ok(commandRef.current(text));h.render();assert.equal(demand().props.value,'120');assert.deepEqual(otherInputs(),before);assert.equal(h.find('StandaloneScenarioBackup').props.context.months,6);assert.equal(h.saved.size,0);}
 commandRef.current('Fill Technology gap over 4 months');h.render();assert.equal(demand().props.value,'');assert.equal(h.find('StandaloneScenarioBackup').props.context.months,4);assert.equal(h.saved.size,0);
 commandRef.current('Fill Managed Services gap');h.render();assert.equal(demand().props.value,'120');
 const staleCommand=commandRef.current,staleController=trend.props.controlRef.current;activeToken='legacy-v1:0';assert.equal(staleController.read('BU-MGSVC'),null);assert.match(staleCommand('Fill this gap'),/dataset|reopen/i);assert.equal(h.saved.size,0);
});
test('Overview dispatches active trend follow-up before clearing the trend or generic transport',()=>{
 const text=fs.readFileSync(new URL('components/pages/overall-overview-page.tsx',app),'utf8'),ast=ts.createSourceFile('overview.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const sends=[];function scan(n){if((ts.isVariableDeclaration(n)||ts.isFunctionDeclaration(n))&&n.name?.getText(ast)==='send')sends.push(n);ts.forEachChild(n,scan);}scan(ast);assert.equal(sends.length,1);const body=sends[0].getText(ast),route=body.indexOf('riskCommand.current');assert.ok(route>=0);assert.ok(body.indexOf('setRiskRequest(null)',route)>route);assert.match(body.slice(route,body.indexOf('setRiskRequest(null)',route)),/return/);
});
