import type {ReactNode} from 'react';
import type {ChatEvidenceSeries} from '@/lib/chat-evidence-series';
import {ChatEvidenceChart} from './chat-evidence-chart';
import type {ChatMessage} from '@/lib/types';

export function currentHomeVisualAnswer(messages:ChatMessage[], charts:Map<ChatMessage,{context:string}>, context:string, ready:boolean, pending:boolean, error:boolean) {
  const latest=messages.at(-1);
  return ready&&!pending&&!error&&latest?.role==='assistant'&&charts.get(latest)?.context===context?latest:null;
}

export function HomeConversationSplit({enabled,visuals,children}:{enabled:boolean;visuals:ReactNode;children:ReactNode}) {
  return <div className="home-conversation-split" data-split={enabled?'':undefined}><div className="home-conversation-text">{children}</div>{enabled&&visuals}</div>;
}

/** Only the current turn's verified series enters this panel; never retain a prior chart while answering. */
export function HomeAnswerVisuals({pending,error,current,series,supplement}: {pending:boolean;error:boolean;current:boolean;series:ChatEvidenceSeries[];supplement?:ReactNode}) {
  const status=pending?'Preparing visuals for your question.':error?'No current visual: the answer could not be completed.':!current?'Ask a question to see its supported visuals here.':!series.length&&!supplement?'No chart is available for this answer.':null;
  return <aside className="home-answer-visuals" aria-label="Current answer visuals" aria-busy={pending}>
    <h3 className="text-lg font-semibold">{status?'Answer visuals':'Visuals for this answer'}</h3>
    {status?<p role="status" className="text-sm text-muted-foreground">{status}</p>:<>{series.map(series=><ChatEvidenceChart key={series.metric} series={series}/>)}{supplement}</>}
  </aside>;
}
