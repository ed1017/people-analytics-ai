"use client";
import {useSyncExternalStore} from 'react';
export type WorkspacePalette='slate-blue'|'light';
export const WORKSPACE_PALETTE_KEY='people-analytics-workspace-palette-v1';
const changed='workspace-palette-changed';
let sessionPalette:WorkspacePalette|null=null;
const valid=(value:unknown):WorkspacePalette=>value==='slate-blue'||value==='original-navy-teal'?'slate-blue':'light';
const snapshot=():WorkspacePalette=>{if(sessionPalette)return sessionPalette;try{return valid(localStorage.getItem(WORKSPACE_PALETTE_KEY))}catch{return 'light'}};
const subscribe=(notify:()=>void)=>{const storage=(event:StorageEvent)=>{if(event.key===WORKSPACE_PALETTE_KEY||event.key===null){sessionPalette=valid(event.newValue);document.documentElement.dataset.workspacePreference=sessionPalette;notify()}};window.addEventListener(changed,notify);window.addEventListener('storage',storage);return()=>{window.removeEventListener(changed,notify);window.removeEventListener('storage',storage)}};
export function useWorkspacePalette(){
 const palette=useSyncExternalStore(subscribe,snapshot,()=> 'light' as WorkspacePalette);
 const setPalette=(value:WorkspacePalette)=>{sessionPalette=valid(value);document.documentElement.dataset.workspacePreference=sessionPalette;try{localStorage.setItem(WORKSPACE_PALETTE_KEY,sessionPalette)}catch{/* Keep the selection for this tab when local storage is unavailable. */}window.dispatchEvent(new Event(changed))};
 return [palette,setPalette] as const;
}
