"use client";
type PromptGroup = {label:string;collapsed?:boolean;purpose?:'swp-business';prompts:readonly {label:string;prompt:string}[]};
export function PromptExamples({prompts,groups,draft,busy,onSend,hideHeading=false}:{hideHeading?:boolean;prompts:readonly string[];groups?:readonly PromptGroup[];draft:string;busy:boolean;onSend:(prompt:string,purpose?:'swp-business')=>void}) {
 if(!prompts.length)return null;
 const occupied=Boolean(draft.trim());
 const grouped=groups?.filter(group=>group.prompts.every(item=>prompts.includes(item.prompt)));
 const button=(prompt:string,label=prompt,purpose?:'swp-business')=><button key={prompt} type="button" disabled={busy} onClick={()=>{if(!busy)onSend(prompt,purpose)}} className="min-h-11 max-w-full rounded-lg border px-3 py-2 text-left text-sm leading-snug hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{label}</button>;
 return <section aria-label="Suggested questions" className="@container space-y-2">
  {!hideHeading&&<h3 className="text-xl font-semibold">Suggested prompts</h3>}
  {occupied&&<p className="text-sm text-muted-foreground">Suggested prompts send immediately. Your draft stays in the text box.</p>}
  {grouped?.length ? <div className="space-y-4">{grouped.map(group=><details key={group.label} open={!group.collapsed} role="group" aria-label={group.label} className="min-w-0 space-y-2">
   <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold">{group.label}</summary>
   <div className="flex flex-wrap gap-2">{group.prompts.map(item=>button(item.prompt,item.label,group.purpose))}</div>
  </details>)}</div> : <div className="flex flex-wrap gap-2">{prompts.map(prompt=>button(prompt))}</div>}
 </section>;
}
