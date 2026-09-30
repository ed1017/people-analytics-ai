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
  activeView: PlanningWorkspaceView;
  setActiveView: (view: PlanningWorkspaceView) => void;
};

const PlanningSessionContext =
  createContext<PlanningSessionContextValue | null>(null);
export function PlanningSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeView, setActiveView] =
    useState<PlanningWorkspaceView>("overview");

  return (
    <PlanningSessionContext.Provider
      value={{
        activeView,
        setActiveView,
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
