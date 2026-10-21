"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
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
type PlanningSessionContextValue = {
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
}: {
  children: ReactNode;
  goalKey: string;
  onTalentEvidenceContextChange: (snapshot: string | null) => void;
  capacityState?:ReturnType<typeof useCapacitySessionState>;
  carriedGoalActions?:CarriedPlanningGoalActions;
}) {
  const [activeView, setActiveView] =
    useState<PlanningWorkspaceView>("overview");

  const localCapacityState=useCapacitySessionState(goalKey);
  const currentCapacityState=capacityState??localCapacityState;
  return (
    <PlanningSessionContext.Provider
      value={{
        carriedGoalActions,
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
