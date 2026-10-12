'use client';
import {readPilotLifecycleExample} from '@/lib/pilot-lifecycle-example';
import {PilotLifecycleView} from './pilot-lifecycle-view';
import {decisionStore,useDecisionStorage} from './decision-store';
/** One shared read-only presentation on Home and in the historical Brief. */
export function PilotLifecycleExample({raw,goalId,goal}:{raw:unknown;goalId:string;goal:string}){
 useDecisionStorage();
 const example=readPilotLifecycleExample(raw,goalId,decisionStore.getDatasetToken());
 if(!example)return null;
 return <PilotLifecycleView record={example.record} historical={example.historical} goal={goal}/>;
}
