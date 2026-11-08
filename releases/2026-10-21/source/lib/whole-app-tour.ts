import type {AppPage} from './types';
export type WholeAppTourStage='scenario'|'saved'|'plans'|'track';
export const wholeAppTourSteps:Record<WholeAppTourStage,{page:AppPage;nextPage?:AppPage;title:string;instruction:string}>={
 scenario:{page:'planning-overview',title:'Staffing scenario demo',instruction:'Four required steps: press Enter to submit the prefilled prompt, compare staffing options, choose Develop and move your team, then review and save. The fictional inputs stay fixed for this guided example.'},
 saved:{page:'planning-overview',nextPage:'action-plans',title:'Inspect your saved proposal',instruction:'The four staffing steps are complete. The example goal and Action Plan are saved together in this browser. Choose Action plans to inspect the actual saved proposal, or exit the demo.'},
 plans:{page:'action-plans',nextPage:'plan-track',title:'Follow your saved plan',instruction:'Review the saved proposal, costs and proposed owners. Choose Track this plan to see the actual tracking screen. Saving a plan is not evidence that the work was done.'},
 track:{page:'plan-track',title:'Review the target and tracking',instruction:'This is the actual Track screen for the plan you saved. No outcome measurements were invented. Finish to return to normal use; your saved example and earlier work remain available.'}
};
export function advanceWholeAppTour(stage:WholeAppTourStage,page:AppPage):WholeAppTourStage|null{
 if(wholeAppTourSteps[stage].nextPage!==page)return null;
 return ({saved:'plans',plans:'track'} as const)[stage as 'saved'|'plans']??null;
}
