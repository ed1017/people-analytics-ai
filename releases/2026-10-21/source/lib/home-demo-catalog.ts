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
 {key:'capacity',id:'demo-capacity-mix',goal:'Add 5 roles over 12 months',name:'Compare staffing assumptions',
  objective:'Compare a fictional mix of development, internal moves and hires for five additional whole roles.',
  coordination:'Review distinct fictional Build and Move groups, explicit release premises and full-period hire costs before comparing bounded combinations.',
  component:{name:'Hire additional roles',domain:'hiring' as const,firstStep:'Review fictional whole-position hiring costs and arrival assumptions.',ownerRole:'Workforce planning lead'},
  budget:100000,participants:5,acceptance:'Five conditional roles by the stated deadline; eligibility, release, funding and delivery remain unverified.',
  planningDigest:'0fe1a3d382f0fe8a6a20b8eb9bfc93fda852c87e68d1c51a56bdbd84c24c9ea9'},
] as const;
export type HomeDemoExample=typeof homeDemoExamples[number];
export function demoBundle(example:HomeDemoExample):SolutionBundle {
 return {origin:homeDemoOrigin,id:'A',name:example.name,objective:example.objective,coordination:example.coordination,components:[{id:'c1',...example.component,evidence:[],dependsOn:[],limitation},...(example.key==='capacity'?[{id:'c2',name:'Develop internal candidates',domain:'learning' as const,firstStep:'Review the fictional Build group and its assumed readiness month.',ownerRole:'Learning lead',evidence:[],dependsOn:[],limitation},{id:'c3',name:'Move internal candidates',domain:'mobility' as const,firstStep:'Review the fictional Move group and release premise.',ownerRole:'People partner',evidence:[],dependsOn:[],limitation}]:[])],limitation};
}
// Frozen hashes of actionBinding(id, goal, {sources:[]}, {origin:homeDemoOrigin,key}).
// Demo bindings never claim to represent current workforce evidence.
export function demoBinding(example:HomeDemoExample):ActionBinding {
 return {version:1,goalId:example.id,goal:example.goal,evidenceDigest:'0f38dfd582c15171ba2d3150a246d9cdc4710248816e05891670f25af4ee3bf0',planningDigest:example.planningDigest};
}
export const swpDemoGoal='Support service growth within budget';
/** Separate exact local template; original first-run examples and pinned bindings are unchanged. */
export function swpDemoBundle():SolutionBundle{return {...demoBundle(homeDemoExamples.find(e=>e.key==='capacity')!),name:'Service growth capacity plan'};}
/** Separate deterministic illustration linked to a reviewed managed-services workload gap. */
export function serviceStaffingBundle():SolutionBundle{return {...swpDemoBundle(),name:'Managed-services workload staffing illustration',objective:'Compare separately reviewed illustrative staffing routes for a managed-services role-slice gap.'};}
export function validDemoBundle(bundle:SolutionBundle,goal:string):boolean {
 if(JSON.stringify(bundle)===JSON.stringify(serviceStaffingBundle()))return !!goal.trim();
 if(goal===swpDemoGoal)return JSON.stringify(bundle)===JSON.stringify(swpDemoBundle());
 const example=homeDemoExamples.find(item=>item.goal===goal);
 return !!example&&JSON.stringify(bundle)===JSON.stringify(demoBundle(example));
}
export function readHomeDemo(raw:unknown,goalId:string):{example:HomeDemoExample;preparedAt:string}|null {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const value=raw as Record<string,unknown>,example=homeDemoExamples.find(item=>item.id===goalId&&item.key===value.key);
 return example&&Object.keys(value).sort().join()==='key,preparedAt,version'&&value.version===1&&typeof value.preparedAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(value.preparedAt)&&Number.isFinite(Date.parse(value.preparedAt))?{example,preparedAt:value.preparedAt}:null;
}
