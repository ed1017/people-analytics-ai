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
    setCapacitySession:(session:CapacitySession)=>setSessions(current=>({...current,[capacityKey]:session}))};
}

export type PlanningWorkspaceView =
  | "overview"
  | "plan"
  | "design"
  | "respond"
  | "execute";

type PlanningSessionContextValue = {
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
}: {
  children: ReactNode;
  goalKey: string;
  onTalentEvidenceContextChange: (snapshot: string | null) => void;
  capacityState?:ReturnType<typeof useCapacitySessionState>;
}) {
  const [activeView, setActiveView] =
    useState<PlanningWorkspaceView>("overview");

  const localCapacityState=useCapacitySessionState(goalKey);
  const currentCapacityState=capacityState??localCapacityState;
  return (
    <PlanningSessionContext.Provider
      value={{
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
