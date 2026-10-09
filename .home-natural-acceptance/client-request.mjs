/** Execute the exact source-pinned Home request constructor; no copied request adapter. */
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';
import {readSolutionRequest,readSolutionState,emptySolutionState} from '../lib/home-solution-conversation.ts';
import {readPlanAlternatives,createPlanAlternatives} from '../lib/home-plan-alternatives.ts';
import {planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {captureGoalProgressInput} from '../lib/goal-progress-conversation.ts';
import {progressEntryContext} from '../lib/goal-progress-entry-store.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
const seed=JSON.parse(readFileSync(new URL('./client-seed.json',import.meta.url)));
const path=new URL('../components/use-home-solution-conversation.ts',import.meta.url);
const source=ts.createSourceFile(path.pathname,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);
const hook=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='useHomeSolutionConversation');
export const constructorSource=['catalog','selectedPlanId','makeRequest'].map(name=>{
 const nodes=hook?.body.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name)??[];
 if(nodes.length!==1)throw Error('client_constructor_changed');return nodes[0].getText(source);
}).join('\n');
const compiled=ts.transpileModule(constructorSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
export function ordinaryClientRequest(text,state=emptySolutionState()){
 const data=new Map(),decisionStore=new DecisionStore();
 decisionStore.initialize({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)});
 const currentProps={current:{...structuredClone(seed),target:()=>null}},memoryRef={current:readSolutionState(state)};
 // Progress is off in the minimal requested Preview config. Execute the app
 // helpers with that explicit feature state; no model or request policy override.
 const make=new Function('currentProps','memoryRef','decisionStore','readPlanAlternatives','createPlanAlternatives','planAlternativesField','captureGoalProgressInput','progressEntryContext','readSolutionRequest','crypto',compiled+'\nreturn makeRequest;')(
  currentProps,memoryRef,decisionStore,readPlanAlternatives,createPlanAlternatives,planAlternativesField,
  (store,id)=>captureGoalProgressInput(store,id,false),(store,id,turns)=>progressEntryContext(store,id,turns,false),readSolutionRequest,webcrypto);
 return make(text);
}
