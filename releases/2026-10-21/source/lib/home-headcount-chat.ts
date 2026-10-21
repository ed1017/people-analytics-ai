import {acceptsGroundedAggregate} from './public-home-receipt.mjs';
import {normalizeHomePack} from './home-pack.mjs';
import type {SolutionRequest} from './home-solution-conversation';
// @ts-expect-error Native fixtures share source.
import {answerEvidenceSeries} from './chat-evidence-series.ts';
type Grounding=Parameters<typeof answerEvidenceSeries>[1];
/** Only a bounded snapshot question. Planning, causal and dated questions retain their normal route. */
export function headcountChatReply(request:SolutionRequest,grounding:Grounding){
 const text=request.message.text.trim().toLowerCase().replace(/[?.!]$/,'');
 if(!['how has our headcount changed','show headcount snapshots','show our headcount trend'].includes(text))return null;
 const unavailable={answer:'The current headcount snapshots could not be verified for this scope. Refresh the workforce evidence before comparing them.',charts:[]};
 const source=normalizeHomePack(request.evidence).sources.find((s:{id:string})=>s.id==='W1');
 if(!source||!grounding||!acceptsGroundedAggregate(grounding,request.evidence,source,request))return unavailable;
 const charts=answerEvidenceSeries(request.evidence,grounding,request.requestId,'headcount','Recorded snapshots [W1]');
 if(charts.length!==1||charts[0].omitted!==0)return unavailable;
 const chart=charts[0],first=chart.points[0],last=chart.points.at(-1)!,change=last.value-first.value;
 const number=(n:number)=>n.toLocaleString('en-US');
 const answer=`Recorded headcount snapshots for ${chart.scope}:\n\n${chart.points.map(p=>`- ${p.date}: ${number(p.value)} people.`).join('\n')}\n\nHeadcount ${change>0?'increased by '+number(change):change<0?'decreased by '+number(-change):'was unchanged at '+number(last.value)}${change!==0?' people':''} between ${first.date} and ${last.date}. Source: Workforce snapshot [W1], as of ${chart.asOf}. These are ${chart.synthetic?'synthetic ':''}recorded snapshots, not a forecast or an explanation of causes. Only the supplied observations are compared.`;
 return {answer,charts};
}
