import type {AppPage} from './types';
export type WholeAppTourStage='overview'|'workforce'|'future'|'scenario'|'saved'|'plans'|'track';
export const wholeAppTourSteps:Record<WholeAppTourStage,{page:AppPage;nextPage?:AppPage;title:string;instruction:string}>={
 overview:{page:'home',nextPage:'workforce',title:'1. Understand the business',instruction:'You are planning a fictional service-team expansion. Review the real Overview snapshot, then choose Workforce in the app navigation. Company evidence does not establish the example team’s availability.'},
 workforce:{page:'workforce',nextPage:'future-of-work',title:'2. Review the workforce baseline',instruction:'Inspect the workforce evidence in its displayed scope. Open Planning steps and choose Future of Work. These records are evidence to review, not a staffing recommendation.'},
 future:{page:'future-of-work',nextPage:'planning-overview',title:'3. Consider how work changes',instruction:'Review the Future of Work Lab and its assumptions. For this case, choose Scenarios to compare staffing responses; do not treat modeled work changes as achieved productivity.'},
 scenario:{page:'planning-overview',title:'4. Make the staffing decision',instruction:'Complete the prescribed service-team prompt below. Compare the actual calculated options, choose Develop and move your team, review the proposal, then explicitly save. Inputs stay fictional and fixed for this guided case.'},
 saved:{page:'planning-overview',nextPage:'action-plans',title:'5. Inspect what you saved',instruction:'The app saved the example goal and Action Plan together. Open Planning steps and choose Action plans to inspect the actual saved proposal.'},
 plans:{page:'action-plans',nextPage:'plan-track',title:'6. Follow the saved plan',instruction:'Review the saved proposal, costs and proposed owners. Choose Track this plan to see the actual tracking screen. Saving a plan is not evidence that the work was done.'},
 track:{page:'plan-track',title:'7. Separate the target from the result',instruction:'This is the actual Track screen for the plan you saved. No outcome measurements were invented. Finish to return to normal use; your saved example and earlier work remain available.'}
};
export function advanceWholeAppTour(stage:WholeAppTourStage,page:AppPage):WholeAppTourStage|null{
 if(wholeAppTourSteps[stage].nextPage!==page)return null;
 return ({overview:'workforce',workforce:'future',future:'scenario',saved:'plans',plans:'track'} as const)[stage as 'overview'|'workforce'|'future'|'saved'|'plans']??null;
}
