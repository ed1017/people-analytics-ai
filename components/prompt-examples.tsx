"use client";
export function PromptExamples({prompts,draft,busy,onDraft}:{prompts:readonly string[];draft:string;busy:boolean;onDraft:(prompt:string)=>void}) {
 if(!prompts.length)return null;
 const occupied=Boolean(draft.trim());
 return <section aria-label="Suggested questions" className="space-y-2">
  <p className="text-sm text-muted-foreground">{occupied?'Your draft is kept. Clear it to choose another example.':'Choose an example to edit, then send when ready.'}</p>
  <div className="flex flex-wrap gap-2">{prompts.map(prompt=><button key={prompt} type="button" disabled={busy||occupied} onClick={()=>{if(!busy&&!draft.trim())onDraft(prompt)}} className="min-h-11 rounded-lg border px-3 py-2 text-left text-sm leading-snug hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{prompt}</button>)}</div>
 </section>;
}
