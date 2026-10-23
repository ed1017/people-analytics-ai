"use client";
import {useSyncExternalStore} from 'react';
export const NAVIGATION_PREFERENCE_KEY='people-analytics-navigation-collapsed-v1';
const eventName='navigation-preference-changed';
let sessionChoice:boolean|null=null;
const decode=(value:string|null):boolean|null=>value==='true'?true:value==='false'?false:null;
const snapshot=()=>{if(sessionChoice!==null)return sessionChoice;try{return decode(localStorage.getItem(NAVIGATION_PREFERENCE_KEY));}catch{return null;}};
const subscribe=(notify:()=>void)=>{const changed=(event:StorageEvent)=>{if(event.key===NAVIGATION_PREFERENCE_KEY||event.key===null){sessionChoice=decode(event.newValue);notify();}};window.addEventListener(eventName,notify);window.addEventListener('storage',changed);return()=>{window.removeEventListener(eventName,notify);window.removeEventListener('storage',changed);};};
export function useNavigationPreference(chatVisible:boolean){
 const choice=useSyncExternalStore(subscribe,snapshot,()=>null);
 const setCollapsed=(value:boolean)=>{sessionChoice=value;try{localStorage.setItem(NAVIGATION_PREFERENCE_KEY,String(value));}catch{/* Preserve explicit choice in this tab if storage is unavailable. */}window.dispatchEvent(new Event(eventName));};
 return [choice??chatVisible,setCollapsed] as const;
}
