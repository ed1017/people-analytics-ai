import type {SolutionRequest} from './home-solution-conversation';
/** Deterministic context only: no additional read, classification of user intent or invented scope. */
export function solutionClock(request:Pick<SolutionRequest,'timeZone'>,now:Date,phase:'request-start'|'tool-execution'|'conversation-preparation'='request-start'){
 return {utc:now.toISOString(),timeZone:request.timeZone,local:new Intl.DateTimeFormat('en-US',{timeZone:request.timeZone,dateStyle:'full',timeStyle:'long'}).format(now),basis:`Server clock at ${phase}; not an evidence observation date.`};
}
export function solutionPreparation(request:SolutionRequest,now:Date,phase:'request-start'|'conversation-preparation'){
 const sources=(request.evidence as {sources:{id:string;status:unknown}[]}).sources;
 return {clock:solutionClock(request,now,phase),coverage:{basis:'Only currentEvidence.sources in the supplied packet. Each source retains its scope, observation date, facts and limitations there. Local read_evidence lookups cannot add populations, metrics, periods or rankings.',sources:sources.map(({id,status})=>({id,status})),boundary:'If a requested comparison or ranking is absent, explain that specific limit and give a conditional next step. Do not relabel business units as teams or infer a ranking from company totals.'}};
}
