/** A saved conversational example remains fictional when reopened or renamed. */
export const homeGuideOriginField='homeGuideOriginV1';
export type HomeGuideOrigin={version:1;origin:'conversation-guide-v1';goalId:string;createdAt:string};
export function readHomeGuideOrigin(raw:unknown,goalId:string):HomeGuideOrigin|null {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const value=raw as HomeGuideOrigin;
 return Object.keys(value).length===4&&value.version===1&&value.origin==='conversation-guide-v1'&&value.goalId===goalId&&/^guided-[a-zA-Z0-9-]+$/.test(goalId)&&typeof value.createdAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(value.createdAt)&&Number.isFinite(Date.parse(value.createdAt))?value:null;
}
