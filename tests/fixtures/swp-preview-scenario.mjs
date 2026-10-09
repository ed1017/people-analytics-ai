/** Newly authored fictional literals. No workforce, browser, file or database reads. */
import {normalizeHomePack} from '../../lib/home-pack.mjs';
import {emptySolutionState,readSolutionRequest} from '../../lib/home-solution-conversation.ts';
import {SWP_DEMAND_MODE} from '../../lib/swp-demand.ts';
export const fixture=Object.freeze({id:'swp-managed-services-minimal-v1',clock:'2026-10-08T12:00:00.000Z',datasetToken:'legacy-v1:0',origin:'newly-authored-fictional-only',workforceFacts:false,projectAllocations:false,turns:[
 'We’re taking on two new managed-services contracts. Can our current teams cover them?',
 'Make that nine months.',
 'We have four existing Service Analysts in this same role slice. Assume 25% of each is available for these contracts; keep the other assumptions and explain the remaining uncertainty.',
],localActions:[{afterTurn:1,text:'Use your assumptions for now',effect:'Accept scenario premises, compute provisional options with pure application helpers; no goal save.'},{afterTurn:2,text:'Use your assumptions for now',effect:'Accept only the revised scenario; recompute and retain original provenance.'},{afterTurn:3,text:'Use your assumptions for now',effect:'Accept the revised capacity premise; recompute with internal pools excluded. A zero gap generates no plan.'}]});
export function scenarioRequest(index,state=emptySolutionState(),review=null,comparison=null){
 if(!Number.isInteger(index)||index<0||index>=fixture.turns.length)throw Error('Unknown fixture turn.');
 const goal={id:'',statement:''};return readSolutionRequest({version:1,requestId:`swp-preview-${index+1}`,goal,scope:'Invented service-planning fixture; no source workforce facts',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',evidence:normalizeHomePack({workforceScope:'Fictional fixture with all source facts unavailable',sources:[]}),goalContext:{goalContext:null,scenarioReview:{conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-preview-fixture',datasetToken:fixture.datasetToken,boundGoal:goal,revision:1,demandProposal:review,acceptedForScenario:!!review,staffingComparison:comparison}},selectedId:null,catalog:null,state,message:{id:`swp-preview-user-${index+1}`,text:fixture.turns[index]}});
}
