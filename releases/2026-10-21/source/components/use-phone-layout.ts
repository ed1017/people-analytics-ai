"use client";
import {useSyncExternalStore} from 'react';
export const PHONE_LAYOUT_QUERY='(max-width: 767px), (max-width: 950px) and (max-height: 500px)';
const subscribe=(notify:()=>void)=>{const query=window.matchMedia(PHONE_LAYOUT_QUERY);query.addEventListener('change',notify);return()=>query.removeEventListener('change',notify)};
export function usePhoneLayout(){return useSyncExternalStore(subscribe,()=>window.matchMedia(PHONE_LAYOUT_QUERY).matches,()=>false)}
