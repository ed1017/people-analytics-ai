'use client';
import {decisionStore,useDecisionStorage} from '@/components/decision-store';
import {usePlanningSession} from './planning-session-context';
import {PositionAllocationPlanner} from './position-allocation-planner';
export {PositionInventoryWorkspace} from './position-allocation-planner';
export function TalentInventoryScenarios(){
 const {goalKey}=usePlanningSession(),storage=useDecisionStorage(),goalId=goalKey.slice(goalKey.indexOf(':')+1),datasetToken=decisionStore.getDatasetToken();
 return <PositionAllocationPlanner key={`${datasetToken}:${goalId}:${storage.ready}`} goalId={goalId} datasetToken={datasetToken}/>;
}
