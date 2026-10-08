"use client";
import { datasetFetch, datasetSession } from "@/lib/dataset-client.mjs";
import { useEffect, useRef, useState } from "react";
import { PageBriefingCache, type PageBriefingResult } from "@/lib/page-briefing-cache";

export function usePageBriefing(context: string, enabled: boolean, sourceLoading: boolean, sourceError: string | null) {
  const cache = useRef(new PageBriefingCache());
  useEffect(()=>datasetSession.subscribe(()=>cache.current.invalidateDataset()),[]);
  const [result, setResult] = useState<PageBriefingResult & { key: string }>({key:"",text:"",error:null});
  const [retry, setRetry] = useState(0);
  const retrySeen = useRef(0);
  const activeContext = useRef("");
  useEffect(() => {
    activeContext.current = enabled && !sourceLoading && !sourceError ? context : "";
    if (!enabled || sourceLoading || sourceError) return;
    let current = true;
    const timer = window.setTimeout(() => {
      const force = retry !== retrySeen.current;
      retrySeen.current = retry;
      void cache.current.get(context, async () => {
        if (activeContext.current !== context) return null;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 45000);
        try {
          const response = await datasetFetch("/api/chat", {method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({...JSON.parse(context),summaryOnly:true,history:[],message:"Give a concise opening briefing for this destination from its supplied current evidence. Use at most 100 words. On Planning Overview, explain how to use the five destinations in order with one action per destination. Else summarize two useful facts, their scope/date, and one limitation. Do not run tools or models."})});
          const data = await response.json();
          return response.ok ? {text:data.answer || "No briefing returned.",error:null} : {text:"",error:"The page briefing is unavailable. Try again."};
        } catch { return {text:"",error:"The page briefing is unavailable. Try again."}; }
        finally { window.clearTimeout(timeout); }
      }, force).then(next => { if(current && next) setResult({...next,key:context}); });
    }, 650);
    return () => { current = false; window.clearTimeout(timer); };
  }, [context, enabled, sourceLoading, sourceError, retry]);
  const matching = result.key === context;
  return { text: enabled && !sourceLoading && !sourceError && matching ? result.text : "", error: sourceError ? "Page evidence is unavailable. Reload to retry the source." : (matching ? result.error : null), loading: enabled && !sourceError && (sourceLoading || !matching), retry: () => { if (sourceError) { window.location.reload(); return; } setResult({key:"",text:"",error:null}); setRetry(value=>value+1); } };
}
