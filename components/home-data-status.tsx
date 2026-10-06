import {DataLoadingStatus} from '@/components/data-loading-status';

export function HomeDataStatus({loading,available,total,error,onRefresh}:{loading:boolean;available:number;total:number;error:string|null;onRefresh:()=>void}) {
 if(loading)return <DataLoadingStatus name="Home data status" detail="Loading source summaries. Previous figures are not current; your drafts and saved goals are kept."/>;
 if(!error&&available===total)return null;
 return <div role="status" aria-label="Home data status" aria-live="polite" aria-atomic="true" className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
  <div className="min-w-0 flex-1"><p className="font-semibold">{available===0?'Data unavailable':'Some data is unavailable'}</p><p className="mt-1 text-xs text-muted-foreground">{available} of {total} source summaries available. {available===0?'You can still explore and edit the saved demo plans.':'Answers use available sources only.'} Missing data is not zero.</p></div>
  <button type="button" onClick={onRefresh} className="min-h-11 rounded border px-3 py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">Refresh data</button>
 </div>;
}
