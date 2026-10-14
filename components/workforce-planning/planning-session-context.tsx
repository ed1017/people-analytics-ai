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
export type CapacitySession={saveName?:string;draft:CapacityDraft;result:ReturnType<typeof calculateMonthlyWorkload>|null;error:string;cost?:CapacityCost|null;scope:CapacityScope|null;capture:CapacityCapture|null};
const emptyCapacitySession:CapacitySession={draft:{...emptyCapacityDraft,costRate:''},cost:null,result:null,error:'',scope:null,capture:null};

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
}: {
  children: ReactNode;
  goalKey: string;
  onTalentEvidenceContextChange: (snapshot: string | null) => void;
}) {
  const [activeView, setActiveView] =
    useState<PlanningWorkspaceView>("overview");

  const datasetToken=useSyncExternalStore(datasetSession.subscribe,datasetSession.snapshot,()=> 'pending');
  const capacityKey=JSON.stringify([datasetToken,goalKey]);
  const [capacitySessions,setCapacitySessions]=useState<Record<string,CapacitySession>>({});
  return (
    <PlanningSessionContext.Provider
      value={{
        goalKey,
        capacitySession:capacitySessions[capacityKey]??emptyCapacitySession,
        setCapacitySession:session=>setCapacitySessions(current=>({...current,[capacityKey]:session})),
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
