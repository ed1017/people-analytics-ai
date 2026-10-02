"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type PlanningWorkspaceView =
  | "overview"
  | "plan"
  | "design"
  | "respond"
  | "execute";

type PlanningSessionContextValue = {
  goalKey: string;
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

  return (
    <PlanningSessionContext.Provider
      value={{
        goalKey,
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
