import type {SolutionBundle} from './home-solution-bundles';
import type {ActionBinding} from './home-action-drafts';

export const homeDemoField='homeDemoV1';
export const homeDemoOrigin='local-demo-v1' as const;
const limitation='Fictional example; costs, availability and effectiveness are unverified.';
export const homeDemoExamples=[
 {key:'retention',id:'demo-reduce-turnover',goal:'Reduce turnover',name:'Manager check-ins',
  objective:'Run regular manager check-ins and review workload concerns with a small volunteer pilot group.',
  coordination:'Use check-ins to agree workload adjustments, then review participation and feedback with the same pilot group.',
  component:{name:'Manager check-ins',domain:'manager_workload' as const,firstStep:'Run fortnightly check-ins with a volunteer pilot group and agree one manageable workload adjustment per participant.',ownerRole:'People partner and team managers'},
  budget:3000,participants:10,acceptance:'Complete three check-ins per participant and review feedback; compare voluntary turnover for the same population and period when available.',
  planningDigest:'5848d337c179d0b265fb24637bd0d06ac7378398d5cdd77d9e921ba8d58bab41'},
 {key:'skills',id:'demo-close-skill-gaps',goal:'Close AI skill gaps',name:'Build AI skills',
  objective:'Run practical AI learning sessions and review a work sample from each participant in a small pilot.',
  coordination:'Pair guided practice with a work sample review to identify which skills need further support.',
  component:{name:'AI practice sessions',domain:'learning' as const,firstStep:'Run guided AI practice sessions, then review a work sample against an agreed skills rubric.',ownerRole:'Learning lead and team managers'},
  budget:5000,participants:12,acceptance:'Complete a practice work sample per participant and compare baseline and final rubric scores; training completion alone does not establish skill improvement.',
  planningDigest:'e00b11e50e6847b8de27d7442e661ee802cf0d7e2d810bbdbd1ab76be2f26c02'},
] as const;
export type HomeDemoExample=typeof homeDemoExamples[number];
export function demoBundle(example:HomeDemoExample):SolutionBundle {
 return {origin:homeDemoOrigin,id:'A',name:example.name,objective:example.objective,coordination:example.coordination,components:[{id:'c1',...example.component,evidence:[],dependsOn:[],limitation}],limitation};
}
// Frozen hashes of actionBinding(id, goal, {sources:[]}, {origin:homeDemoOrigin,key}).
// Demo bindings never claim to represent current workforce evidence.
export function demoBinding(example:HomeDemoExample):ActionBinding {
 return {version:1,goalId:example.id,goal:example.goal,evidenceDigest:'0f38dfd582c15171ba2d3150a246d9cdc4710248816e05891670f25af4ee3bf0',planningDigest:example.planningDigest};
}
export function validDemoBundle(bundle:SolutionBundle,goal:string):boolean {
 const example=homeDemoExamples.find(item=>item.goal===goal);
 return !!example&&JSON.stringify(bundle)===JSON.stringify(demoBundle(example));
}
export function readHomeDemo(raw:unknown,goalId:string):{example:HomeDemoExample;preparedAt:string}|null {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const value=raw as Record<string,unknown>,example=homeDemoExamples.find(item=>item.id===goalId&&item.key===value.key);
 return example&&Object.keys(value).sort().join()==='key,preparedAt,version'&&value.version===1&&typeof value.preparedAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(value.preparedAt)&&Number.isFinite(Date.parse(value.preparedAt))?{example,preparedAt:value.preparedAt}:null;
}
