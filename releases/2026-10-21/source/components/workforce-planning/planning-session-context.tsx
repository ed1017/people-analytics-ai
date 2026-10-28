"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type SetStateAction,
} from "react";

import {datasetSession} from '@/lib/dataset-client.mjs';
import {emptyCapacityDraft,type CapacityDraft} from '@/lib/swp-capacity-draft';
import type {CapacityScope,CapacityCapture} from '@/lib/swp-capacity-store';
import type {CapacityCost} from '@/lib/swp-capacity-cost';
import type {calculateMonthlyWorkload} from '@/lib/swp-monthly-workload';
export type CapacitySession={openedScenario?:{id:string;name:string;inputKey:string};saveName?:string;draft:CapacityDraft;result:ReturnType<typeof calculateMonthlyWorkload>|null;error:string;cost?:CapacityCost|null;scope:CapacityScope|null;capture:CapacityCapture|null};
const emptyCapacitySession:CapacitySession={draft:{...emptyCapacityDraft,costRate:''},cost:null,result:null,error:'',scope:null,capture:null};

export function useCapacitySessionState(goalKey:string) {
  const datasetToken=useSyncExternalStore(datasetSession.subscribe,datasetSession.snapshot,()=> 'pending');
  const capacityKey=JSON.stringify([datasetToken,goalKey]);
  const [sessions,setSessions]=useState<Record<string,CapacitySession>>({});
  return {datasetToken,capacitySession:sessions[capacityKey]??emptyCapacitySession,
    setCapacitySession:(session:CapacitySession)=>setSessions(current=>({...current,[capacityKey]:session})),
    // An explicit goal choice carries this worksheet, never a saved scenario binding.
    setCapacitySessionForGoal:(id:string,session:CapacitySession)=>{
      const targetKey=JSON.stringify([datasetToken,goalKey.slice(0,goalKey.indexOf(':')+1)+id]);
      const next=structuredClone(session);next.capture=null;delete next.openedScenario;
      setSessions(current=>({...current,[targetKey]:next}));
    }};
}

export type PlanningWorkspaceView =
  | "overview"
  | "plan"
  | "design"
  | "respond"
  | "execute";

export type CarriedPlanningGoalActions={businessGoal:string;goals:{id:string;statement:string}[];disabled:boolean;onCreate:(statement:string)=>void;onSelect:(id:string)=>void};
export type PositionEditorDraft={baselineRows:import("@/lib/position-design-scenario").PositionRecord[];scope:string;asOf:string;scenario:import("@/lib/position-design-scenario").PositionScenario|null;rows:import("@/lib/position-design-scenario").PositionRecord[];editing:import("@/lib/position-design-scenario").PositionRecord|null};
export type PositionGoalActions={businessGoal?:string;goals:{id:string;statement:string}[];disabled:boolean;onCreate:(statement:string)=>string;onSelect:(id:string)=>string};
type PlanningSessionContextValue = {
  futureWorkDrafts:Record<string,import('@/lib/future-work-example').FutureWorkInputs>;
  setFutureWorkDraft:(key:string,input:import('@/lib/future-work-example').FutureWorkInputs)=>void;
  positionGoalActions?:PositionGoalActions;
  positionDesignDraft?:PositionEditorDraft;
  setPositionDesignDraft:(draft:SetStateAction<PositionEditorDraft|undefined>)=>void;
  canCarryPositionDesignDraft:(goalId:string)=>boolean;
  carryPositionDesignDraft:(goalId:string,draft:PositionEditorDraft)=>void;
  carriedGoalActions?:CarriedPlanningGoalActions;
  goalKey: string;
  capacitySession:CapacitySession;
  setCapacitySession:(session:CapacitySession)=>void;
  activeView: PlanningWorkspaceView;
  setActiveView: (view: PlanningWorkspaceView) => void;
  setTalentEvidenceContext: (snapshot: string | null) => void;
};

const PlanningSessionContext =
  createContext<PlanningSessionContextValue | null>(null);
export function PlanningSessionProvider({
  children,
  goalKey,
  onTalentEvidenceContextChange,
  capacityState,
  carriedGoalActions,
  positionGoalActions,
}: {
  children: ReactNode;
  goalKey: string;
  onTalentEvidenceContextChange: (snapshot: string | null) => void;
  capacityState?:ReturnType<typeof useCapacitySessionState>;
  carriedGoalActions?:CarriedPlanningGoalActions;
  positionGoalActions?:PositionGoalActions;
}) {
  const [activeView, setActiveView] =
    useState<PlanningWorkspaceView>("overview");

  const localCapacityState=useCapacitySessionState(goalKey);
  const currentCapacityState=capacityState??localCapacityState;
  const [positionDrafts,setPositionDrafts]=useState<Record<string,PositionEditorDraft|undefined>>({});
  const positionKey=JSON.stringify([currentCapacityState.datasetToken,goalKey]);
  const [futureDrafts,setFutureDrafts]=useState<Record<string,Record<string,import('@/lib/future-work-example').FutureWorkInputs>>>({});
  const setFutureWorkDraft=(key:string,input:import('@/lib/future-work-example').FutureWorkInputs)=>setFutureDrafts(current=>({...current,[positionKey]:{...current[positionKey],[key]:input}}));
  const setPositionDesignDraft=useCallback((draft:SetStateAction<PositionEditorDraft|undefined>)=>setPositionDrafts(current=>({...current,[positionKey]:typeof draft==="function"?draft(current[positionKey]):draft})),[positionKey]);
  const canCarryPositionDesignDraft=useCallback((id:string)=>{
    const target=goalKey.slice(0,goalKey.indexOf(':')+1)+id;
    const targetKey=JSON.stringify([currentCapacityState.datasetToken,target]);
    return Boolean(id)&&positionDrafts[targetKey]===undefined;
  },[currentCapacityState.datasetToken,goalKey,positionDrafts]);
  const carryPositionDesignDraft=useCallback((id:string,draft:PositionEditorDraft)=>{
    if(!id)return;
    const target=goalKey.slice(0,goalKey.indexOf(':')+1)+id;
    const targetKey=JSON.stringify([currentCapacityState.datasetToken,target]);
    if(!canCarryPositionDesignDraft(id))throw Error("That goal already has a position draft. Choose another goal; both drafts remain unchanged.");
    setPositionDrafts(current=>current[targetKey]===undefined?({...current,[targetKey]:structuredClone(draft)}):current);
  },[currentCapacityState.datasetToken,goalKey,canCarryPositionDesignDraft]);
  return (
    <PlanningSessionContext.Provider
      value={{
        futureWorkDrafts:futureDrafts[positionKey]??{},setFutureWorkDraft,
        carriedGoalActions,
        positionGoalActions,
        positionDesignDraft:positionDrafts[positionKey],
        setPositionDesignDraft,carryPositionDesignDraft,canCarryPositionDesignDraft,
        goalKey,
        capacitySession:currentCapacityState.capacitySession,
        setCapacitySession:currentCapacityState.setCapacitySession,
        activeView,
        setActiveView,
        setTalentEvidenceContext: onTalentEvidenceContextChange,
      }}
    >
      {children}
    </PlanningSessionContext.Provider>
  );
}

export function usePlanningSession() {
  const context = useContext(PlanningSessionContext);

  if (!context) {
    throw new Error(
      "usePlanningSession must be used within PlanningSessionProvider"
    );
  }

  return context;
}
