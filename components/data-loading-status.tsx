import {LoaderCircle} from 'lucide-react';

/** Indeterminate: shown only while the caller's actual request is pending. */
export function DataLoadingStatus({label='Loading data…',detail='You can keep drafting or navigate while data loads.',name='Data loading status'}:{label?:string;detail?:string;name?:string}) {
 return <div role="status" aria-label={name} aria-live="polite" aria-atomic="true" className="flex min-w-0 items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
  <LoaderCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 animate-spin text-primary motion-reduce:animate-none"/>
  <div className="min-w-0"><p className="font-semibold text-foreground">{label}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
 </div>;
}
