'use client';
import {createContext,useContext,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

const ResultsContext=createContext<{target:HTMLElement|null;active:boolean}|null>(null);

/** Presentation only: controls and their state remain mounted in the response column. */
export function PlannerResultsProvider({target,active,children}:{target:HTMLElement|null;active:boolean;children:ReactNode}){
 return <ResultsContext.Provider value={{target,active}}>{children}</ResultsContext.Provider>;
}
export function useSplitPlannerResults(){return useContext(ResultsContext)!==null;}
export function PlannerResults({children}:{children:ReactNode}){
 const split=useContext(ResultsContext);
 if(!split)return <>{children}</>;
 if(!split.target)return null;
 return createPortal(<div hidden={!split.active} className="min-w-0 space-y-3">{children}</div>,split.target);
}
