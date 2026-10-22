// @ts-expect-error Native fixtures share the source module.
import {readChatEvidenceSeries,type ChatEvidenceSeries} from './chat-evidence-series.ts';
export const homeAnswerVisualField='home-answer-visual-v1';
export function restoreHomeAnswerVisual(raw:unknown,context:string,token:string,turns:{role:string;text:string}[]):ChatEvidenceSeries[]{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return [];
 const v=raw as Record<string,unknown>;
 if(v.version!==1||v.context!==context||v.datasetToken!==token||typeof v.requestId!=='string'||typeof v.answer!=='string'||typeof v.question!=='string'||turns.at(-1)?.role!=='assistant'||turns.at(-1)?.text!==v.answer||turns.at(-2)?.role!=='user'||turns.at(-2)?.text!==v.question)return [];
 return readChatEvidenceSeries(v.series,v.requestId,token);
}
