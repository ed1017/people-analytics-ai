"use client";
type PromptGroup = {label:string;prompts:readonly {label:string;prompt:string}[]};
export function PromptExamples({prompts,groups,draft,busy,onDraft}:{prompts:readonly string[];groups?:readonly PromptGroup[];draft:string;busy:boolean;onDraft:(prompt:string)=>void}) {
 if(!prompts.length)return null;
 const occupied=Boolean(draft.trim());
 const grouped=groups?.filter(group=>group.prompts.every(item=>prompts.includes(item.prompt)));
 const button=(prompt:string,label=prompt)=><button key={prompt} type="button" disabled={busy||occupied} onClick={()=>{if(!busy&&!draft.trim())onDraft(prompt)}} className="min-h-11 max-w-full rounded-lg border px-3 py-2 text-left text-sm leading-snug hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{label}</button>;
 return <section aria-label="Suggested questions" className="@container space-y-2">
  {occupied&&<p className="text-sm text-muted-foreground">Your draft is kept. Clear it to choose another example.</p>}
  {grouped?.length ? <div className="space-y-4">{grouped.map(group=><div key={group.label} role="group" aria-label={group.label} className="min-w-0 space-y-2">
   <h4 className="text-xs font-medium text-muted-foreground">{group.label}</h4>
   <div className="flex flex-wrap gap-2">{group.prompts.map(item=>button(item.prompt,item.label))}</div>
  </div>)}</div> : <div className="flex flex-wrap gap-2">{prompts.map(prompt=>button(prompt))}</div>}
 </section>;
}
